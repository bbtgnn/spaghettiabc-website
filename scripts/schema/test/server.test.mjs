import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { SCRIPTS, collection, field, liveFixture, run as runWithToken, tempRepo } from "./util.mjs";
import { stubServer } from "./stub-server.mjs";
import { fakeContent } from "./fake-content.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { runPull } from "../pull.mjs";

/** sync run without EMDASH_TOKEN in the environment (a CI token must not leak into these tests) */
function run(script, args, root) {
	const env = { ...process.env, SCHEMA_REPO_ROOT: root };
	delete env.EMDASH_TOKEN;
	const r = spawnSync(process.execPath, [path.join(SCRIPTS, `${script}.mjs`), ...args], { encoding: "utf8", env });
	return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: r.stdout + r.stderr };
}
void runWithToken;

/** async variant of util.run (the stub server lives in this process, so spawnSync would deadlock) */
function runAsync(script, args, root, env = {}) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [path.join(SCRIPTS, `${script}.mjs`), ...args], {
			env: { ...process.env, SCHEMA_REPO_ROOT: root, EMDASH_TOKEN: "", ...env },
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		child.on("close", (status) => resolve({ status, stdout, stderr, out: stdout + stderr }));
	});
}

/** temp repo whose seed renames tours.group_size -> party_size, with the generated 0002 migration */
function repoWithRename() {
	const t = tempRepo();
	const seed = t.seed();
	const tours = collection(seed, "tours");
	tours.fields.find((f) => f.slug === "group_size").slug = "party_size";
	t.writeSeed(seed);
	const r = run("generate", ["rename-group-size", "--rename", "tours.group_size=party_size", "--allow-destructive"], t.root);
	assert.equal(r.status, 0, r.out);
	return t;
}

const withEnv = (stub, extra = {}) => ({ EMDASH_TOKEN: stub.token, ...extra });
const liveSlugs = (stub) => stub.state.find((c) => c.slug === "tours").fields.map((f) => f.slug);

test("usage errors exit 2 (no network)", () => {
	const t = tempRepo();
	try {
		for (const script of ["apply", "verify", "drift"]) {
			assert.equal(run(script, [], t.root).status, 2, `${script} without --url`);
			assert.equal(run(script, ["--url", "http://127.0.0.1:1", "--bogus"], t.root).status, 2, `${script} --bogus`);
		}
		assert.equal(run("apply", ["--url", "http://127.0.0.1:1", "--phase", "sideways"], t.root).status, 2);
		const remote = run("verify", ["--url", "https://cms.example.invalid"], t.root);
		assert.equal(remote.status, 2, remote.out);
		assert.match(remote.out, /EMDASH_TOKEN/);
		assert.equal(run("pull", ["--bogus"], t.root).status, 2);
		assert.equal(run("rehearse", ["--bogus"], t.root).status, 2);
	} finally {
		t.cleanup();
	}
});

test("unreachable server exits 6", () => {
	const t = tempRepo();
	try {
		const r = run("verify", ["--url", "http://127.0.0.1:1"], t.root);
		assert.equal(r.status, 6, r.out);
	} finally {
		t.cleanup();
	}
});

test("verify / drift on a matching live schema (token auth)", async () => {
	const t = tempRepo();
	const stub = await stubServer(liveFixture());
	try {
		const v = await runAsync("verify", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(v.status, 0, v.out);
		assert.ok(stub.calls.every((c) => c.auth === `Bearer ${stub.token}`));
		const d = await runAsync("drift", ["--url", stub.url, "--json"], t.root, withEnv(stub));
		assert.equal(d.status, 0, d.out);
		const j = JSON.parse(d.stdout);
		assert.equal(j.inChain, true);
		assert.deepEqual(j.pendingMigrations, []);
		const bad = await runAsync("verify", ["--url", stub.url], t.root, { EMDASH_TOKEN: "wrong" });
		assert.equal(bad.status, 6, bad.out);
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("verify fails with a diff (exit 1) and drift reports DRIFT (exit 4) on a hand-edited live schema", async () => {
	const t = tempRepo();
	const live = liveFixture();
	live.find((c) => c.slug === "tours").fields.push({ id: "x", slug: "rogue", label: "Rogue", type: "string", columnType: "TEXT", required: false, unique: false, searchable: false, indexed: false, translatable: true });
	const stub = await stubServer(live);
	try {
		const v = await runAsync("verify", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(v.status, 1, v.out);
		assert.match(v.out, /fields\[rogue\]/);
		const d = await runAsync("drift", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(d.status, 4, d.out);
		assert.match(d.out, /DRIFT/);
		const a = await runAsync("apply", ["--url", stub.url, "--json"], t.root, withEnv(stub));
		assert.equal(a.status, 4, a.out);
		assert.equal(JSON.parse(a.stdout).drift.diff[0].path, ".collections[tours].fields[rogue]");
		assert.ok(!stub.calls.some((c) => c.method !== "GET"), "apply must not write when drifted");
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("apply: dry run plans, pre/post phases apply in order and re-hash after each step", async () => {
	const t = repoWithRename();
	const stub = await stubServer(liveFixture());
	try {
		const dry = await runAsync("apply", ["--url", stub.url, "--dry-run"], t.root, withEnv(stub));
		assert.equal(dry.status, 0, dry.out);
		assert.match(dry.out, /pre: addField tours.party_size/);
		assert.match(dry.out, /backfill tours-party_size/);
		assert.match(dry.out, /post \[destructive\]: removeField tours.group_size/);
		assert.ok(!stub.calls.some((c) => c.method !== "GET"));
		const prePlan = await runAsync("apply", ["--url", stub.url, "--phase", "pre", "--dry-run", "--json"], t.root, withEnv(stub));
		assert.doesNotMatch(prePlan.stdout, /"(removeField|deleteCollection)"|"destructive"[\t ]*:[\t ]*true/, "pre plan has nothing destructive");

		const pre = await runAsync("apply", ["--url", stub.url, "--phase", "pre", "--json"], t.root, withEnv(stub));
		assert.equal(pre.status, 0, pre.out);
		assert.ok(liveSlugs(stub).includes("party_size") && liveSlugs(stub).includes("group_size"), "pre adds, never removes");
		assert.equal(JSON.parse(pre.stdout).steps.filter((s) => s.kind === "ops").length, 1);

		const drift = await runAsync("drift", ["--url", stub.url, "--json"], t.root, withEnv(stub));
		assert.match(JSON.parse(drift.stdout).position, /pre ops applied/);

		// deploy.yml greps the post dry-run JSON with this exact regex to decide on a D1 Time Travel bookmark
		const ciGuard = /"(removeField|deleteCollection)"|"destructive"[\t ]*:[\t ]*true/;
		const postPlan = await runAsync("apply", ["--url", stub.url, "--phase", "post", "--dry-run", "--json"], t.root, withEnv(stub));
		assert.equal(postPlan.status, 0, postPlan.out);
		assert.match(postPlan.stdout, ciGuard, "post dry-run JSON must expose the destructive step to the CI guard");
		assert.equal(JSON.parse(postPlan.stdout).destructive, true);
		assert.ok(!stub.calls.some((c) => c.method === "DELETE"), "dry run never deletes");

		const again = await runAsync("apply", ["--url", stub.url, "--phase", "pre"], t.root, withEnv(stub));
		assert.equal(again.status, 0, again.out);
		assert.match(again.out, /catch-up/, "re-running pre at the pre state only re-runs the idempotent backfill");

		const post = await runAsync("apply", ["--url", stub.url, "--phase", "post"], t.root, withEnv(stub));
		assert.equal(post.status, 0, post.out);
		assert.ok(!liveSlugs(stub).includes("group_size"));
		const v = await runAsync("verify", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(v.status, 0, v.out);
		const done = await runAsync("apply", ["--url", stub.url], t.root, withEnv(stub));
		assert.match(done.out, /up to date/);
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("apply --phase all in one go; a server that stores something else is caught (exit 4)", async () => {
	const t = repoWithRename();
	const good = await stubServer(liveFixture());
	const evil = await stubServer(liveFixture(), { mangle: (f) => (f.slug === "party_size" ? { ...f, translatable: false } : f) });
	try {
		const ok = await runAsync("apply", ["--url", good.url, "--phase", "all"], t.root, withEnv(good));
		assert.equal(ok.status, 0, ok.out);
		assert.deepEqual(liveSlugs(good).includes("group_size"), false);
		const bad = await runAsync("apply", ["--url", evil.url, "--phase", "all"], t.root, withEnv(evil));
		assert.equal(bad.status, 4, bad.out);
		assert.match(bad.out, /MISMATCH/);
		assert.match(bad.out, /translatable/);
		assert.ok(liveSlugs(evil).includes("group_size"), "nothing destructive runs after a mismatch");
	} finally {
		await good.close();
		await evil.close();
		t.cleanup();
	}
});

test("apply: a refused op exits 6 and a re-run resumes where it stopped", async () => {
	const t = repoWithRename();
	let refuseBadge = true;
	const stub = await stubServer(liveFixture(), { refuse: (m, p, body) => (refuseBadge && m === "POST" && p.endsWith("/fields/reorder") ? { code: "BOOM", message: "boom", status: 500 } : null) });
	try {
		const r1 = await runAsync("apply", ["--url", stub.url, "--phase", "all"], t.root, withEnv(stub));
		assert.equal(r1.status, 6, r1.out);
		assert.match(r1.out, /interrupted|re-run schema:apply to resume/);
		assert.ok(liveSlugs(stub).includes("party_size"), "the op before the failure was applied");
		const d = await runAsync("drift", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(d.status, 0, "an interrupted migration is a known position, not drift");
		assert.match(d.out, /interrupted/);
		refuseBadge = false;
		const r2 = await runAsync("apply", ["--url", stub.url, "--phase", "all"], t.root, withEnv(stub));
		assert.equal(r2.status, 0, r2.out);
		assert.match(r2.out, /resuming an interrupted migration/);
		const v = await runAsync("verify", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(v.status, 0, v.out);
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("apply: collection with content refuses deleteCollection -> exit 5 (never force)", async () => {
	const t = tempRepo();
	// second migration deleting `training`
	const seed = t.seed();
	seed.collections = seed.collections.filter((c) => c.slug !== "training");
	delete seed.content?.training;
	t.writeSeed(seed);
	const g = run("generate", ["drop-training", "--allow-destructive"], t.root);
	assert.equal(g.status, 0, g.out);
	const stub = await stubServer(liveFixture(), { refuse: (m, p) => (m === "DELETE" && p === "/schema/collections/training" ? { code: "COLLECTION_HAS_CONTENT", message: "has content", status: 400 } : null) });
	try {
		const r = await runAsync("apply", ["--url", stub.url, "--phase", "all"], t.root, withEnv(stub));
		assert.equal(r.status, 5, r.out);
		assert.match(r.out, /BLOCKED/);
		assert.ok(stub.calls.every((c) => !c.path.includes("force")));
	} finally {
		await stub.close();
		t.cleanup();
	}
});

/** stub ownership resolver for in-process runPull: the listener belongs to `root` (never reachable from the CLI) */
const listenerAt = (cwd) => () => ({ cwds: [cwd], unknown: false });

test("pull CLI uses the real ownership lookup and refuses a server owned by another checkout (exit 2)", async (ctx) => {
	if (process.platform === "win32" || spawnSync("lsof", ["-v"]).error) return ctx.skip("needs lsof");
	const t = tempRepo();
	const before = t.read("seed/seed.json");
	const stub = await stubServer(liveFixture());
	try {
		// the stub listens inside THIS process, whose cwd is not the temp repo -> foreign
		const r = await runAsync("pull", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(r.status, 2, r.out);
		assert.match(r.out, /FOREIGN_SERVER/);
		assert.equal(t.read("seed/seed.json"), before);
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("runPull refuses a foreign listener, and an unknown one when the url is the default", async () => {
	const t = tempRepo();
	const before = t.read("seed/seed.json");
	const stub = await stubServer(liveFixture());
	try {
		await assert.rejects(runPull({ url: stub.url, root: t.root, token: stub.token, ownership: listenerAt(tmpdir()) }), (e) => e.code === "FOREIGN_SERVER" && e.exit === 2);
		assert.equal(t.read("seed/seed.json"), before);
		await assert.rejects(runPull({ url: stub.url, root: t.root, token: stub.token, explicitUrl: false, ownership: () => ({ cwds: [], unknown: true }) }), (e) => e.code === "FOREIGN_SERVER");
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("pull: unchanged server leaves seed.json byte-identical; new live field is written with the file's style", async () => {
	const t = tempRepo();
	const before = t.read("seed/seed.json");
	const stub = await stubServer(liveFixture());
	try {
		const ours = listenerAt(t.root);
		const pull = (dryRun = false) => runPull({ url: stub.url, root: t.root, token: stub.token, dryRun, ownership: ours });
		const same = await pull();
		assert.equal(same.changed, false);
		assert.equal(t.read("seed/seed.json"), before);

		const tours = stub.state.find((c) => c.slug === "tours");
		tours.fields.push({ id: "n", slug: "badge", label: "Badge", type: "string", columnType: "TEXT", required: false, unique: false, searchable: true, indexed: false, translatable: true });
		tours.fields.find((f) => f.slug === "price").label = "Prezzo";
		tours.icon = "map";
		stub.state.splice(stub.state.findIndex((c) => c.slug === "training"), 1);
		const dry = await pull(true);
		assert.equal(t.read("seed/seed.json"), before, "dry run writes nothing");
		assert.equal(dry.changed, true);
		assert.equal(dry.written, false);
		assert.equal(t.read("seed/seed.json"), before, "dry run writes nothing");
		const pulled = await pull();
		assert.equal(pulled.written, true);
		const text = t.read("seed/seed.json");
		assert.match(text, /^\{\n\t"/, "tabs preserved");
		assert.ok(text.endsWith("}\n"));
		const seed = t.seed();
		assert.equal(field(seed, "tours", "badge").searchable, true);
		assert.deepEqual(Object.keys(field(seed, "tours", "badge")), ["slug", "label", "type", "searchable"]);
		assert.equal(field(seed, "tours", "price").label, "Prezzo");
		assert.equal(collection(seed, "tours").icon, "map");
		assert.equal(collection(seed, "training"), undefined);
		const orig = JSON.parse(before);
		for (const k of Object.keys(orig).filter((k) => k !== "collections")) assert.deepEqual(seed[k], orig[k], `${k} preserved`);
		const v = await runAsync("verify", ["--url", stub.url], t.root, withEnv(stub));
		assert.equal(v.status, 0, `seed after pull must verify against the same server\n${v.out}`);
	} finally {
		await stub.close();
		t.cleanup();
	}
});

const toursContent = () =>
	fakeContent("tours", [
		{ id: "pub", data: { title: "P", group_size: "8" } },
		{ id: "edit", data: { title: "E", group_size: "8" }, draft: { title: "E (draft)", group_size: "3" } },
		{ id: "dro", status: "draft", data: { title: "D", group_size: "2" }, live: null },
	]);

test("apply with content: backfill (stage-only for editor drafts), gate passes, destructive post runs", async () => {
	const t = repoWithRename();
	const content = toursContent();
	const stub = await stubServer(liveFixture(), { content });
	try {
		const pre = await runAsync("apply", ["--url", stub.url, "--phase", "pre"], t.root, withEnv(stub));
		assert.equal(pre.status, 0, pre.out);
		assert.equal(content.find("pub").columns.party_size, "8");
		assert.equal(content.find("edit").columns.party_size, undefined);
		assert.equal(content.find("edit").draft.party_size, "3");
		assert.equal(content.find("dro").status, "draft");
		assert.ok(liveSlugs(stub).includes("group_size"));
		// an entry written by the old code between pre and the deploy
		content.entries.push({ ...content.find("pub"), id: "late", slug: "late", columns: { title: "L", group_size: "5" }, live: { title: "L", group_size: "5" }, revisions: [] });
		const post = await runAsync("apply", ["--url", stub.url, "--phase", "post"], t.root, withEnv(stub));
		assert.equal(post.status, 0, post.out);
		assert.match(post.out, /gate ok/);
		assert.equal(content.find("late").columns.party_size, "5", "catch-up backfill covers entries created after pre");
		assert.ok(!liveSlugs(stub).includes("group_size"));
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("apply: post phase is BLOCKED (exit 5) while an entry's pending draft lacks the backfilled value", async () => {
	const t = repoWithRename();
	// a module transform that declines one value leaves that draft without the target
	const mig = path.join(t.root, "schema/migrations/0002_rename-group-size.json");
	const doc = JSON.parse(readFileSync(mig, "utf8"));
	doc.backfills[0].transform = "module";
	writeFileSync(mig, `${JSON.stringify(doc, null, "\t")}\n`);
	t.write("schema/migrations/0002_rename-group-size.backfill.mjs", 'export function transform(value) {\n\treturn value === "3" ? undefined : value;\n}\n');
	const content = toursContent();
	const stub = await stubServer(liveFixture(), { content });
	try {
		const pre = await runAsync("apply", ["--url", stub.url, "--phase", "pre"], t.root, withEnv(stub));
		assert.equal(pre.status, 0, pre.out);
		const post = await runAsync("apply", ["--url", stub.url, "--phase", "post", "--json"], t.root, withEnv(stub));
		assert.equal(post.status, 5, post.out);
		assert.match(post.stderr, /BLOCKED/);
		assert.match(post.stderr, /tours\/edit/);
		const j = JSON.parse(post.stdout);
		assert.equal(j.steps.at(-1).blockers[0].id, "edit");
		assert.ok(liveSlugs(stub).includes("group_size"), "nothing was removed");
		// the editor publishes/fixes the draft -> unblocked
		content.find("edit").draft.party_size = "3";
		const again = await runAsync("apply", ["--url", stub.url, "--phase", "post"], t.root, withEnv(stub));
		assert.equal(again.status, 0, again.out);
		assert.ok(!liveSlugs(stub).includes("group_size"));
	} finally {
		await stub.close();
		t.cleanup();
	}
});
