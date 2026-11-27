import assert from "node:assert/strict";
import { test } from "node:test";
import { executePlan } from "../lib/execute.mjs";
import { EXIT } from "../lib/errors.mjs";
import { loadMigrations } from "../lib/migrations.mjs";
import { buildPositions, locate } from "../lib/position.mjs";
import { connect } from "../lib/server.mjs";
import { stubServer } from "./stub-server.mjs";
import { collection, liveFixture, run, tempRepo } from "./util.mjs";

const toursField = (seed, slug) => collection(seed, "tours").fields.find((f) => f.slug === slug);
const liveSlugs = (stub) => stub.state.find((c) => c.slug === "tours").fields.map((f) => f.slug);

/** temp repo whose seed renames tours.group_size -> party_size, with the generated 0002 migration */
function repoWithRename() {
	const t = tempRepo();
	const seed = t.seed();
	toursField(seed, "group_size").slug = "party_size";
	t.writeSeed(seed);
	const r = run("generate", ["rename-group-size", "--rename", "tours.group_size=party_size", "--allow-destructive"], t.root);
	assert.equal(r.status, 0, r.out);
	return t;
}

/** migrations + positions + a hand-built pre-ops plan starting from live at S1 (baseline applied) */
function renamePreSetup(root) {
	const { migrations, errors: loadErrors } = loadMigrations(root);
	assert.equal(loadErrors.length, 0, loadErrors.map((e) => e.message).join("\n"));
	const { positions, errors: posErrors } = buildPositions(migrations);
	assert.equal(posErrors.length, 0, posErrors.map((e) => e.message).join("\n"));
	const m = migrations[1];
	assert.ok(m, "expect 0002 rename migration");
	const plan = {
		steps: [
			{
				kind: "ops",
				migration: m.id,
				k: 1,
				from: 0,
				to: m.preOps.length,
				ops: m.preOps,
				label: `${m.id} pre`,
			},
		],
	};
	return { migrations, positions, plan, migration: m };
}

test("executePlan: happy-path pre ops exit OK and leave live at the expected hash", async () => {
	const t = repoWithRename();
	const stub = await stubServer(liveFixture());
	try {
		const { migrations, positions, plan, migration } = renamePreSetup(t.root);
		const server = await connect({ url: stub.url, token: stub.token });
		const before = await server.readLiveSchema();
		assert.ok(locate(positions, before.hash), "live starts on the baseline position");

		const logs = [];
		const outcome = await executePlan({
			server,
			plan,
			positions,
			migrations,
			opts: { log: (...a) => logs.push(a.join(" ")) },
		});

		assert.equal(outcome.exit, EXIT.OK, logs.join("\n"));
		assert.equal(outcome.steps.length, 1);
		assert.equal(outcome.steps[0].kind, "ops");
		assert.ok(liveSlugs(stub).includes("party_size"));
		assert.ok(liveSlugs(stub).includes("group_size"), "pre ops never remove");
		assert.equal(outcome.finalLive.hash, outcome.steps[0].expectedHash);
		assert.match(outcome.finalLive.position, new RegExp(migration.id));
	} finally {
		await stub.close();
		t.cleanup();
	}
});

test("executePlan: hash mismatch after ops returns DRIFT", async () => {
	const t = repoWithRename();
	const stub = await stubServer(liveFixture(), {
		mangle: (f) => (f.slug === "party_size" ? { ...f, translatable: false } : f),
	});
	try {
		const { migrations, positions, plan } = renamePreSetup(t.root);
		const server = await connect({ url: stub.url, token: stub.token });

		const logs = [];
		const outcome = await executePlan({
			server,
			plan,
			positions,
			migrations,
			opts: { log: (...a) => logs.push(a.join(" ")) },
		});

		assert.equal(outcome.exit, EXIT.DRIFT, logs.join("\n"));
		assert.equal(outcome.steps.length, 1);
		assert.ok(outcome.steps[0].diff?.length);
		assert.match(logs.join("\n"), /MISMATCH/);
		assert.ok(liveSlugs(stub).includes("party_size"));
		assert.ok(liveSlugs(stub).includes("group_size"), "mismatch stops before destructive work");
	} finally {
		await stub.close();
		t.cleanup();
	}
});
