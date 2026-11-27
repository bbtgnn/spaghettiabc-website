import assert from "node:assert/strict";
import { test } from "node:test";
import { assertModelLiveParity } from "../lib/rehearse.mjs";

const hash = (n) => "a".repeat(63) + String(n);
const canon = (label) => ({ v: 1, collections: [{ slug: label, fields: [] }] });

test("assertModelLiveParity: ok when live == model == seed", () => {
	const h = hash(1);
	const c = canon("tours");
	const r = assertModelLiveParity({
		chainFinal: { hash: h, canonical: c },
		liveHash: h,
		liveCanonical: c,
		seedHash: h,
	});
	assert.equal(r.ok, true);
	assert.equal(r.diff, undefined);
});

test("assertModelLiveParity: fails with message and path diff when live disagrees", () => {
	const modelHash = hash(1);
	const liveHash = hash(2);
	const seedHash = hash(1);
	const modelCanonical = canon("tours");
	const liveCanonical = canon("books");
	const r = assertModelLiveParity({
		chainFinal: { hash: modelHash, canonical: modelCanonical },
		liveHash,
		liveCanonical,
		seedHash,
	});
	assert.equal(r.ok, false);
	assert.match(r.message, /^parity failed: live /);
	assert.match(r.message, new RegExp(`live ${liveHash.slice(0, 12)}`));
	assert.match(r.message, new RegExp(`model ${modelHash.slice(0, 12)}`));
	assert.match(r.message, new RegExp(`seed ${seedHash.slice(0, 12)}`));
	assert.match(r.message, /pure model in scripts\/schema\/lib\/model\.mjs disagrees with the server/);
	assert.ok(Array.isArray(r.diff));
	assert.ok(r.diff.length > 0);
	assert.ok(r.diff.every((d) => "path" in d && "a" in d && "b" in d));
});

test("assertModelLiveParity: fails when seed hash alone differs (even if live == model)", () => {
	const modelHash = hash(1);
	const seedHash = hash(9);
	const c = canon("tours");
	const r = assertModelLiveParity({
		chainFinal: { hash: modelHash, canonical: c },
		liveHash: modelHash,
		liveCanonical: c,
		seedHash,
	});
	assert.equal(r.ok, false);
	assert.match(r.message, new RegExp(`seed ${seedHash.slice(0, 12)}`));
	assert.deepEqual(r.diff, []);
});
