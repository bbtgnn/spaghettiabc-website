import assert from "node:assert/strict";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { REAL_ROOT, collection, field, git, run, tempRepo } from "./util.mjs";

const MIGRATIONS = "schema/migrations";
const files = (t) => readdirSync(path.join(t.root, MIGRATIONS)).sort();

async function withRepo(fn, opts) {
	const t = tempRepo(opts);
	try {
		await fn(t);
	} finally {
		t.cleanup();
	}
}

function commitAll(t) {
	git(t.root, "init", "-q", "-b", "main");
	git(t.root, "add", "-A");
	git(t.root, "commit", "-q", "-m", "init");
}

test("check passes on the real repo and is fast", () => {
	const times = [];
	for (let i = 0; i < 3; i++) {
		const t0 = performance.now();
		const r = run("check", [], REAL_ROOT);
		times.push(performance.now() - t0);
		assert.equal(r.status, 0, r.out);
		assert.match(r.stdout, /schema:check ok/);
	}
	assert.ok(Math.min(...times) < 1000, `schema:check took ${Math.round(Math.min(...times))} ms (budget 1000)`);
});

test("check: usage errors exit 2", () =>
	withRepo((t) => {
		assert.equal(run("check", ["--bogus"], t.root).status, 2);
		assert.equal(run("generate", ["--bogus"], t.root).status, 2);
		assert.equal(run("generate", ["Not Kebab"], t.root).status, 2);
		assert.equal(run("generate", ["--rename", "nonsense"], t.root).status, 2);
	}));

test("check: clean temp repo passes, generate says nothing to do", () =>
	withRepo((t) => {
		assert.equal(run("check", [], t.root).status, 0);
		const g = run("generate", [], t.root);
		assert.equal(g.status, 0);
		assert.match(g.stdout, /nothing to generate/);
		assert.deepEqual(files(t), ["0001_baseline.json"]);
	}));

test("check: seed edited without a migration -> exit 1 with a path diff and the fix", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields.push({ slug: "amount", label: "Importo", type: "number" });
		t.writeSeed(seed);
		const r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /SEED_DRIFT/);
		assert.match(r.stderr, /tours/);
		assert.match(r.stderr, /npm run schema:generate/);
	}));

test("generate: additive change writes the next migration and check passes", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields.splice(2, 0, { slug: "amount", label: "Importo", type: "number" });
		t.writeSeed(seed);
		const g = run("generate", [], t.root);
		assert.equal(g.status, 0, g.out);
		assert.deepEqual(files(t), ["0001_baseline.json", "0002_add-tours-amount.json"]);
		const doc = JSON.parse(t.read(`${MIGRATIONS}/0002_add-tours-amount.json`));
		assert.equal(doc.id, "0002_add-tours-amount");
		assert.equal(doc.destructive, false);
		assert.deepEqual(doc.ops[0], { op: "addField", collection: "tours", field: { slug: "amount", label: "Importo", type: "number" } });
		assert.equal(run("check", [], t.root).status, 0);
		assert.match(run("generate", [], t.root).stdout, /nothing to generate/);
	}));

test("generate: --description and explicit name", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "libri").icon = "book";
		t.writeSeed(seed);
		assert.equal(run("generate", ["libri-icon", "--description", "Book icon"], t.root).status, 0);
		const doc = JSON.parse(t.read(`${MIGRATIONS}/0002_libri-icon.json`));
		assert.equal(doc.description, "Book icon");
	}));

test("generate: rename -> STOP exit 3 with machine-readable JSON, nothing written", () =>
	withRepo((t) => {
		const seed = t.seed();
		field(seed, "tours", "group_size").slug = "party_size";
		t.writeSeed(seed);
		const g = run("generate", [], t.root);
		assert.equal(g.status, 3);
		const out = JSON.parse(g.stdout);
		assert.equal(out.stop, "AMBIGUOUS_FIELD_RENAME");
		assert.ok(out.details && out.hint);
		assert.deepEqual(files(t), ["0001_baseline.json"]);
	}));

test("generate: type change, flag change -> STOP", () =>
	withRepo((t) => {
		const seed = t.seed();
		field(seed, "tours", "price").type = "number";
		t.writeSeed(seed);
		assert.equal(JSON.parse(run("generate", [], t.root).stdout).stop, "FIELD_TYPE_CHANGE_UNSUPPORTED");
		const seed2 = t.seed();
		field(seed2, "tours", "price").type = "string";
		field(seed2, "tours", "price").required = true;
		t.writeSeed(seed2);
		const g = run("generate", [], t.root);
		assert.equal(g.status, 3);
		assert.equal(JSON.parse(g.stdout).stop, "FIELD_FLAG_CHANGE_REFUSED");
	}));

test("generate: destructive needs --allow-destructive and marks the migration", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields = collection(seed, "tours").fields.filter((f) => f.slug !== "included");
		t.writeSeed(seed);
		const refused = run("generate", [], t.root);
		assert.equal(refused.status, 3);
		assert.equal(JSON.parse(refused.stdout).stop, "DESTRUCTIVE_NOT_ALLOWED");
		assert.equal(run("generate", ["--allow-destructive"], t.root).status, 0);
		const doc = JSON.parse(t.read(`${MIGRATIONS}/0002_remove-tours-included.json`));
		assert.equal(doc.destructive, true);
		assert.equal(run("check", [], t.root).status, 0);
	}));

test("generate: --rename expands to add + copy backfill + post removal", () =>
	withRepo((t) => {
		const seed = t.seed();
		field(seed, "tours", "group_size").slug = "party_size";
		t.writeSeed(seed);
		assert.equal(run("generate", ["--rename", "tours.group_size=party_size"], t.root).status, 3, "removal needs --allow-destructive");
		const g = run("generate", ["--rename", "tours.group_size=party_size", "--allow-destructive"], t.root);
		assert.equal(g.status, 0, g.out);
		const doc = JSON.parse(t.read(`${MIGRATIONS}/0002_rename-tours-group-size-to-party-size.json`));
		assert.equal(doc.destructive, true);
		assert.deepEqual(doc.ops.map((o) => o.op), ["addField", "reorderFields", "removeField"].filter((x) => doc.ops.some((o) => o.op === x)));
		assert.deepEqual(doc.backfills, [{ id: "tours-party_size", collection: "tours", to: "party_size", from: "group_size", transform: "copy", locales: "all" }]);
		assert.equal(run("check", [], t.root).status, 0);
	}));

test("generate: type-changing rename writes a TODO stub; check fails until it is implemented", () =>
	withRepo((t) => {
		const seed = t.seed();
		const f = field(seed, "tours", "price");
		f.slug = "amount";
		f.type = "number";
		t.writeSeed(seed);
		const g = run("generate", ["--rename", "tours.price=amount", "--allow-destructive"], t.root);
		assert.equal(g.status, 0, g.out);
		const stub = files(t).find((n) => n.endsWith(".backfill.mjs"));
		assert.ok(stub, "stub written");
		assert.match(t.read(`${MIGRATIONS}/${stub}`), /throw new Error\("TODO/);
		const doc = JSON.parse(t.read(`${MIGRATIONS}/${stub.replace(".backfill.mjs", ".json")}`));
		assert.equal(doc.backfills[0].transform, "module");
		const bad = run("check", [], t.root);
		assert.equal(bad.status, 1);
		assert.match(bad.stderr, /BACKFILL_TODO/);
		t.write(`${MIGRATIONS}/${stub}`, "export function transform(value) {\n\treturn Number.parseFloat(value);\n}\n");
		assert.equal(run("check", [], t.root).status, 0);
		writeFileSync(path.join(t.root, MIGRATIONS, "0009_orphan.backfill.mjs"), "export function transform() {}\n");
		assert.match(run("check", [], t.root).stderr, /BACKFILL_MODULE_ORPHAN/);
	}));

test("generate: --rename that does not match the seed diff is a usage error", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields.push({ slug: "amount", label: "A", type: "number" });
		t.writeSeed(seed);
		const g = run("generate", ["--rename", "tours.price=amount"], t.root);
		assert.equal(g.status, 2);
		assert.match(g.stderr, /must be removed/);
	}));

test("generate: slug reuse is refused after the slug was removed by an earlier migration", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields = collection(seed, "tours").fields.filter((f) => f.slug !== "included");
		t.writeSeed(seed);
		assert.equal(run("generate", ["--allow-destructive"], t.root).status, 0);
		const again = t.seed();
		collection(again, "tours").fields.push({ slug: "included", label: "Incluso", type: "string" });
		t.writeSeed(again);
		const g = run("generate", [], t.root);
		assert.equal(g.status, 3);
		assert.equal(JSON.parse(g.stdout).stop, "SLUG_REUSE");
	}));

test("check: a hand-written migration that re-adds a removed slug fails (SLUG_REUSE)", () =>
	withRepo((t) => {
		t.write(`${MIGRATIONS}/0002_drop.json`, JSON.stringify({ id: "0002_drop", description: "d", destructive: true, ops: [{ op: "removeField", collection: "tours", field: "included" }] }));
		t.write(`${MIGRATIONS}/0003_back.json`, JSON.stringify({ id: "0003_back", description: "b", destructive: false, ops: [{ op: "addField", collection: "tours", field: { slug: "included", label: "I", type: "string" } }] }));
		const r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /SLUG_REUSE/);
	}));

test("check: migration validation (flags, ops, ids, sequence, order, hash collision)", () =>
	withRepo((t) => {
		const mig = (id, doc) => t.write(`${MIGRATIONS}/${id}.json`, JSON.stringify({ id, description: "x", destructive: false, ...doc }));
		const failing = (re) => {
			const r = run("check", [], t.root);
			assert.equal(r.status, 1, r.out);
			assert.match(r.stderr, re);
		};
		const rm = (id) => t.write(`${MIGRATIONS}/${id}.json`, "");
		const remove = { op: "removeField", collection: "tours", field: "included" };

		mig("0002_drop", { ops: [remove] });
		failing(/MIGRATION_DESTRUCTIVE_FLAG/);
		mig("0002_drop", { destructive: true, ops: [remove] });
		failing(/SEED_DRIFT/); // valid migration, but the seed still has the field
		mig("0002_drop", { destructive: true, ops: [remove, { op: "addField", collection: "tours", field: { slug: "z", label: "Z", type: "string" } }] });
		failing(/MIGRATION_OP_ORDER/);
		mig("0002_drop", { ops: [{ op: "explode" }] });
		failing(/MIGRATION_UNKNOWN_OP/);
		mig("0002_drop", { id: "0002_other", ops: [remove] });
		failing(/MIGRATION_INVALID/);
		mig("0002_drop", { ops: [{ op: "updateCollection", collection: "tours", set: { label: collection(t.seed(), "tours").label } }] });
		failing(/HASH_COLLISION/);
		mig("0002_drop", { ops: [{ op: "updateField", collection: "tours", field: "price", set: { type: "number" } }] });
		failing(/FIELD_TYPE_COLUMN_CHANGE/);
		rm("0002_drop");
		t.write(`${MIGRATIONS}/0004_gap.json`, JSON.stringify({ id: "0004_gap", description: "x", destructive: false, ops: [remove] }));
		failing(/MIGRATION_SEQUENCE/);
	}));

test("check: backfill validation", () =>
	withRepo((t) => {
		const base = { id: "0002_bf", description: "x", destructive: false, ops: [{ op: "addField", collection: "tours", field: { slug: "amount", label: "A", type: "number" } }] };
		const put = (backfills) => t.write(`${MIGRATIONS}/0002_bf.json`, JSON.stringify({ ...base, backfills }));
		const seed = t.seed();
		collection(seed, "tours").fields.push({ slug: "amount", label: "A", type: "number" });
		t.writeSeed(seed);
		put([{ id: "b", collection: "tours", to: "amount", from: "price", transform: "copy", locales: "all" }]);
		assert.match(run("check", [], t.root).stderr, /copy between string and number/);
		put([{ id: "b", collection: "tours", to: "amount", from: "nope", transform: "copy", locales: "all" }]);
		assert.match(run("check", [], t.root).stderr, /source field "tours.nope" does not exist/);
		put([{ id: "b", collection: "tours", to: "amount", from: "price", transform: "module", locales: "all" }]);
		assert.match(run("check", [], t.root).stderr, /BACKFILL_MODULE_MISSING/);
		put([]);
		assert.equal(run("check", [], t.root).status, 0);
	}));

test("check: immutability via git merge-base", () =>
	withRepo((t) => {
		commitAll(t);
		assert.equal(run("check", [], t.root).status, 0);
		const file = `${MIGRATIONS}/0001_baseline.json`;

		t.write(file, `${t.read(file)}\n`);
		let r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /MIGRATION_MODIFIED/);
		git(t.root, "add", "-A");
		assert.match(run("check", [], t.root).stderr, /MIGRATION_MODIFIED/, "staged edit");
		git(t.root, "checkout", "-q", "HEAD", "--", file);
		assert.equal(run("check", [], t.root).status, 0);

		git(t.root, "mv", file, `${MIGRATIONS}/0001_renamed.json`);
		r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /MIGRATION_DELETED/);
		git(t.root, "reset", "-q", "--hard", "HEAD");
		assert.equal(run("check", [], t.root).status, 0);

		// appending a new migration is fine, even before it is committed
		const seed = t.seed();
		collection(seed, "tours").fields.push({ slug: "amount", label: "A", type: "number" });
		t.writeSeed(seed);
		assert.equal(run("generate", [], t.root).status, 0);
		assert.equal(run("check", [], t.root).status, 0);
		git(t.root, "add", "-A");
		git(t.root, "commit", "-q", "-m", "add amount");
		// ...but now it is immutable too
		const added = `${MIGRATIONS}/0002_add-tours-amount.json`;
		t.write(added, t.read(added).replace('"A"', '"AA"'));
		assert.match(run("check", [], t.root).stderr, /MIGRATION_MODIFIED/);
	}));

test("check: immutability uses origin/main's merge-base when present", () =>
	withRepo((t) => {
		commitAll(t);
		git(t.root, "update-ref", "refs/remotes/origin/main", "HEAD");
		const seed = t.seed();
		collection(seed, "tours").fields.push({ slug: "amount", label: "A", type: "number" });
		t.writeSeed(seed);
		run("generate", [], t.root);
		git(t.root, "add", "-A");
		git(t.root, "commit", "-q", "-m", "feature branch");
		// the branch's own migration is not frozen yet: origin/main does not know it
		const added = `${MIGRATIONS}/0002_add-tours-amount.json`;
		const edited = JSON.parse(t.read(added));
		edited.description = "reworded on the branch";
		t.write(added, JSON.stringify(edited, null, "\t") + "\n");
		assert.equal(run("check", [], t.root).status, 0);
	}));

test("check: refs lint reports src references to removed fields; allowlist comment silences it", () =>
	withRepo((t) => {
		const seed = t.seed();
		collection(seed, "tours").fields = collection(seed, "tours").fields.filter((f) => f.slug !== "included");
		t.writeSeed(seed);
		assert.equal(run("generate", ["--allow-destructive"], t.root).status, 0);
		assert.equal(run("check", [], t.root).status, 0, "no references yet");

		const page = 'const tours = await getEmDashCollection("tours");\nconst x = tours[0].data.included;\nconst y = tours[0].data.price;\n';
		t.write("src/pages/tours.astro", `---\n${page}---\n`);
		t.write("src/pages/other.astro", "---\nconst z = something.data.included;\n---\n"); // does not query tours
		const r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /REMOVED_FIELD_REFERENCED/);
		assert.match(r.stderr, /src\/pages\/tours\.astro:3: references removed field tours\.included/);
		assert.doesNotMatch(r.stderr, /other\.astro/);
		assert.doesNotMatch(r.stderr, /data\.price/);

		t.write("src/pages/tours.astro", `---\nconst tours = await getEmDashCollection("tours");\n// schema-allow-ref\nconst x = tours[0].data.included;\n---\n`);
		assert.equal(run("check", [], t.root).status, 0);
	}, { withSrc: true }));

test("check: refs lint reports references to a deleted collection", () =>
	withRepo((t) => {
		const seed = t.seed();
		for (const c of seed.collections) for (const f of c.fields) if (f.type === "reference" && f.validation.targetCollection === "training") throw new Error("fixture changed");
		seed.collections = seed.collections.filter((c) => c.slug !== "training");
		t.writeSeed(seed);
		assert.equal(run("generate", ["--allow-destructive"], t.root).status, 0);
		t.write("src/pages/t.astro", '---\nconst e = await getEmDashCollection("training");\n---\n');
		const r = run("check", [], t.root);
		assert.equal(r.status, 1);
		assert.match(r.stderr, /REMOVED_COLLECTION_REFERENCED/);
		assert.ok(existsSync(path.join(t.root, "src/pages/t.astro")));
	}, { withSrc: true }));
