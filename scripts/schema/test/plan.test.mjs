import assert from "node:assert/strict";
import { test } from "node:test";
import { splitOps } from "../lib/index.mjs";
import { collectionCreateBodies, collectionUpdateBody, fieldCreateBody, fieldUpdateBody } from "../lib/project.mjs";
import { buildPlan } from "../lib/plan.mjs";
import { buildPositions, locate, nearest } from "../lib/position.mjs";

const mig = (id, ops, backfills = []) => ({ id, file: `/x/${id}.json`, ops, backfills, ...(({ pre, post }) => ({ preOps: pre, postOps: post }))(splitOps(ops)) });
const create = (slug, fields = []) => ({ op: "createCollection", collection: { slug, label: slug, supports: ["drafts", "revisions"] }, fields: [{ slug: "title", label: "T", type: "string" }, ...fields] });
const add = (c, slug) => ({ op: "addField", collection: c, field: { slug, label: slug, type: "string" } });
const rm = (c, slug) => ({ op: "removeField", collection: c, field: slug });
const bf = (c, from, to) => ({ id: `${c}-${to}`, collection: c, from, to, transform: "copy", locales: "all" });

const M = [
	mig("0001_base", [create("t", [{ slug: "old", label: "Old", type: "string" }])]),
	mig("0002_rename", [add("t", "neu"), rm("t", "old")], [bf("t", "old", "neu")]),
	mig("0003_more", [add("t", "x")]),
	mig("0004_drop", [add("t", "y"), rm("t", "x")], [bf("t", "x", "y")]),
];
const kinds = (plan) => plan.steps.map((s) => `${s.kind}:${s.migration.slice(0, 4)}${s.kind === "ops" ? `:${s.from}-${s.to}` : s.catchUp ? ":catchup" : ""}`);

test("positions: complete states, pre states, interrupted prefixes; unknown hash is drift", () => {
	const { positions: pos, errors } = buildPositions(M);
	assert.equal(errors.length, 0);
	const at = (k, n) => pos.find((p) => p.k === k && p.n === n);
	assert.equal(locate(pos, pos[0].hash).k, 0);
	const pre = at(1, 1);
	assert.equal(pre.kind, "pre");
	assert.deepEqual(locate(pos, pre.hash) && { k: locate(pos, pre.hash).k, n: locate(pos, pre.hash).n }, { k: 1, n: 1 });
	const full = at(1, 2);
	assert.deepEqual({ k: locate(pos, full.hash).k, n: locate(pos, full.hash).n }, { k: 2, n: 0 }, "applied migration normalises to the next one, not started");
	assert.equal(locate(pos, "0".repeat(64)), null);
	const m = [mig("0001_b", [create("t"), add("t", "a"), add("t", "b")])];
	const { positions: p2 } = buildPositions(m);
	const mid = locate(p2, p2.find((p) => p.n === 2).hash);
	assert.equal(mid.exact, false, "op-prefix of a migration = interrupted apply");
	assert.equal(nearest(p2, p2[1].canonical).diff.length, 0);
});

test("plan all: everything remaining, in order, pre -> backfill -> gate -> post", () => {
	assert.deepEqual(kinds(buildPlan({ migrations: M, loc: { k: 1, n: 0 }, phase: "all" })), [
		"ops:0002:0-1", "backfill:0002", "gate:0002", "ops:0002:1-2",
		"ops:0003:0-1",
		"ops:0004:0-1", "backfill:0004", "gate:0004", "ops:0004:1-2",
	]);
});

test("plan pre: stops after the first migration with post ops (its post ops and later migrations wait)", () => {
	const p = buildPlan({ migrations: M, loc: { k: 1, n: 0 }, phase: "pre" });
	assert.deepEqual(kinds(p), ["ops:0002:0-1", "backfill:0002"]);
	assert.match(p.notes.join("\n"), /not started until the post phase: 0003_more, 0004_drop/);
	assert.deepEqual(kinds(buildPlan({ migrations: M, loc: { k: 2, n: 0 }, phase: "pre" })), ["ops:0003:0-1", "ops:0004:0-1", "backfill:0004"], "pre-only migrations are not held back");
});

test("plan post: catch-up backfill + gate + post ops of the in-progress migration, then later migrations whole", () => {
	assert.deepEqual(kinds(buildPlan({ migrations: M, loc: { k: 1, n: 1 }, phase: "post" })), [
		"backfill:0002:catchup", "gate:0002", "ops:0002:1-2",
		"ops:0003:0-1",
		"ops:0004:0-1", "backfill:0004", "gate:0004", "ops:0004:1-2",
	]);
	assert.deepEqual(kinds(buildPlan({ migrations: M, loc: { k: 1, n: 1 }, phase: "pre" })), ["backfill:0002:catchup"], "re-running pre at the pre state only repeats the idempotent backfill");
	assert.deepEqual(kinds(buildPlan({ migrations: M, loc: { k: 4, n: 0 }, phase: "all" })), []);
});

test("plan: a migration interrupted inside its pre ops resumes with the rest, then backfills", () => {
	const m = [mig("0001_b", [create("t", [{ slug: "f", label: "F", type: "string" }]), add("t", "a"), add("t", "b"), rm("t", "f")], [bf("t", "f", "a")])];
	assert.deepEqual(kinds(buildPlan({ migrations: m, loc: { k: 0, n: 2 }, phase: "all" })), ["ops:0001:2-3", "backfill:0001", "gate:0001", "ops:0001:3-4"]);
	assert.deepEqual(kinds(buildPlan({ migrations: m, loc: { k: 0, n: 3 }, phase: "post" })), ["backfill:0001:catchup", "gate:0001", "ops:0001:3-4"]);
});

test("REST bodies: explicit supports, follow-up PUT for titleField/commentsEnabled, clearing values", () => {
	const { create: body, follow } = collectionCreateBodies({
		collection: { slug: "c", label: "C", supports: ["drafts"], titleField: "title", commentsEnabled: true, sortOrder: 20 },
	});
	assert.deepEqual(body.supports, ["drafts"]);
	assert.equal(body.routable, true);
	assert.equal(body.titleField, undefined, "REST create drops titleField");
	assert.deepEqual(follow, { commentsEnabled: true, titleField: "title" });
	assert.deepEqual(collectionUpdateBody({ icon: null, group: null, urlPattern: null, label: "X", hasSeo: true }), { icon: "", group: null, urlPattern: null, label: "X" });
	assert.deepEqual(fieldUpdateBody({ widget: null, validation: null, options: null, defaultValue: null }), { widget: "", validation: null, options: {}, defaultValue: null });
	assert.throws(() => collectionUpdateBody({ admin: null }), /null/);
	const f = fieldCreateBody({ slug: "r", label: "R", type: "reference", validation: { targetCollection: "t", multiple: true }, searchable: true });
	assert.deepEqual(f, { slug: "r", label: "R", type: "reference", required: false, unique: false, searchable: true, indexed: false, translatable: true, validation: { targetCollection: "t", multiple: true } });
	assert.equal(fieldCreateBody({ slug: "s", label: "S", type: "string" }).validation, null);
});
