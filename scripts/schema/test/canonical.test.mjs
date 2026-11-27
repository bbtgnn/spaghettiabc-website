import assert from "node:assert/strict";
import { test } from "node:test";
import {
	applyOps, buildChain, canonicalFromLive, canonicalFromSeed, diffPaths, diffSchemas, emptyCanonical, hashSchema,
	loadMigrations, loadSeedSchema, locateInChain, minimizeCollection, minimizeField, normalizeCollection, stableStringify,
} from "../lib/index.mjs";
import { BASELINE, liveFixture, fixtureSeed, readJson, tempRepo } from "./util.mjs";

test("canonical from the seed equals canonical from the live dump (fixture)", () => {
	const fromSeed = canonicalFromSeed(fixtureSeed());
	const fromLive = canonicalFromLive(liveFixture());
	assert.deepEqual(diffPaths(fromSeed, fromLive), []);
	assert.equal(hashSchema(fromSeed), hashSchema(fromLive));
	assert.equal(hashSchema(fromSeed).slice(0, 12), "347671ecdbe6", "hash recorded by the spike");
});

test("canonical is deterministic and independent of collection order and key order", () => {
	const seed = fixtureSeed();
	const a = hashSchema(canonicalFromSeed(seed));
	assert.equal(a, hashSchema(canonicalFromSeed(seed)));
	assert.equal(a, hashSchema(canonicalFromSeed({ collections: [...seed.collections].reverse() })));
	const shuffled = seed.collections.map((c) => Object.fromEntries(Object.entries(c).reverse()));
	assert.equal(a, hashSchema(canonicalFromSeed(shuffled)));
	assert.equal(a, hashSchema(canonicalFromLive([...liveFixture()].reverse())));
});

test("field order is semantic; one changed property changes the hash", () => {
	const seed = fixtureSeed();
	const base = hashSchema(canonicalFromSeed(seed));
	const swapped = structuredClone(seed);
	swapped.collections[1].fields.reverse();
	assert.notEqual(base, hashSchema(canonicalFromSeed(swapped)));
	const edited = structuredClone(seed);
	edited.collections[1].fields[0].label += "!";
	assert.notEqual(base, hashSchema(canonicalFromSeed(edited)));
});

test("defaults: omitted keys equal their explicit defaults", () => {
	const implicit = { slug: "a", label: "A", fields: [{ slug: "x", label: "X", type: "string" }] };
	const explicit = {
		slug: "a", label: "A", supports: [], routable: true, hidden: false, commentsEnabled: false, editLocking: true,
		commentsModeration: "first_time", commentsClosedAfterDays: 90, commentsAutoApproveUsers: true,
		fields: [{ slug: "x", label: "X", type: "string", required: false, unique: false, searchable: false, indexed: false, translatable: true, widget: "", options: {}, validation: null }],
	};
	assert.equal(stableStringify(canonicalFromSeed([implicit])), stableStringify(canonicalFromSeed([explicit])));
});

test("defaults: server-derived keys (relation, hasSeo, ids) do not affect the hash", () => {
	const live = liveFixture();
	const tweaked = structuredClone(live);
	for (const c of tweaked) {
		c.id = "other";
		c.createdAt = "x";
		for (const f of c.fields) {
			f.id = "other";
			f.sortOrder += 100;
			f.columnType = "WHATEVER";
			if (f.type === "reference") Object.assign(f.validation, { relation: "rel_abc", relationSide: "parent" });
		}
	}
	assert.equal(hashSchema(canonicalFromLive(tweaked)), hashSchema(canonicalFromLive(live)));
});

test("normalization is idempotent and minimize() round-trips", () => {
	const canon = canonicalFromSeed(fixtureSeed());
	for (const c of canon.collections) {
		assert.deepEqual(normalizeCollection(c), c);
		const back = normalizeCollection({ ...minimizeCollection(c), fields: c.fields.map(minimizeField) });
		assert.deepEqual(back, c);
	}
});

test("replay of the baseline migration equals the seed schema and locates the live dump", () => {
	const t = tempRepo();
	try {
		const { migrations, errors } = loadMigrations(t.root);
		assert.deepEqual(errors, []);
		const chain = buildChain(migrations);
		assert.deepEqual(chain.errors, []);
		const seed = loadSeedSchema(t.root);
		assert.equal(chain.final.hash, seed.hash);
		assert.deepEqual(diffPaths(chain.final.canonical, seed.canonical), []);
		assert.equal(locateInChain(chain, hashSchema(canonicalFromLive(liveFixture())))?.migration, migrations[0].id);
		assert.equal(locateInChain(chain, "deadbeef"), null);
		assert.equal(chain.states[0].hash, hashSchema(emptyCanonical()));
	} finally {
		t.cleanup();
	}
});

test("the committed baseline equals the differ output from empty", () => {
	const { ops, stops } = diffSchemas(emptyCanonical(), canonicalFromSeed(fixtureSeed()));
	assert.deepEqual(stops, []);
	assert.equal(hashSchema(applyOps(emptyCanonical(), ops)), hashSchema(canonicalFromSeed(fixtureSeed())));
	assert.deepEqual(readJson(BASELINE).ops, ops);
});
