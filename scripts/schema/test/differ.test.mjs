import assert from "node:assert/strict";
import { test } from "node:test";
import { applyOps, canonicalFromSeed, diffSchemas, hashSchema, newHistory, phaseOf } from "../lib/index.mjs";
import { collection, field, fixtureSeed } from "./util.mjs";

const base = () => canonicalFromSeed(fixtureSeed());

/** diff base -> mutated seed; when there are no stops the ops must replay to exactly the mutated seed */
function diff(mutate, opts) {
	const seed = fixtureSeed();
	mutate(seed);
	const target = canonicalFromSeed(seed);
	const result = diffSchemas(base(), target, opts);
	if (!result.stops.length) {
		assert.equal(hashSchema(applyOps(base(), result.ops, { history: newHistory() })), hashSchema(target), "ops replay to the target");
		const phases = result.ops.map(phaseOf);
		assert.deepEqual(phases, [...phases].sort((a, b) => (a === b ? 0 : a === "pre" ? -1 : 1)), "pre ops come first");
	}
	return result;
}
const stopCodes = (r) => r.stops.map((s) => s.code);

test("no change -> no ops", () => {
	const r = diff(() => {});
	assert.deepEqual(r.ops, []);
	assert.deepEqual(r.stops, []);
});

test("clean additive change set replays exactly", () => {
	const r = diff((seed) => {
		const tours = collection(seed, "tours");
		tours.fields.splice(3, 0, { slug: "amount", label: "Importo", type: "number" }); // mid-collection
		field(seed, "tours", "excerpt").label = "Estratto";
		field(seed, "tours", "excerpt").searchable = true;
		collection(seed, "libri").icon = "book";
		collection(seed, "training").sortOrder = 5;
		seed.collections.push({
			slug: "eventi", label: "Eventi", sortOrder: 60, supports: ["drafts"], titleField: "name",
			fields: [{ slug: "name", label: "Nome", type: "string", required: true }, { slug: "tour", label: "Tour", type: "reference", validation: { targetCollection: "tours" } }],
		});
	});
	assert.deepEqual(r.stops, []);
	assert.deepEqual(r.post, []);
	const ops = r.ops.map((o) => o.op);
	assert.ok(ops.includes("createCollection") && ops.includes("addField") && ops.includes("reorderFields") && ops.includes("updateField") && ops.includes("updateCollection"));
	assert.deepEqual(r.ops.find((o) => o.op === "addField").field, { slug: "amount", label: "Importo", type: "number" });
});

test("forward references to a new collection are deferred until it exists", () => {
	const r = diff((seed) => {
		seed.collections.push({ slug: "a_first", label: "A", sortOrder: 55, supports: [], fields: [{ slug: "peer", label: "Peer", type: "reference", validation: { targetCollection: "z_second" } }] });
		seed.collections.push({ slug: "z_second", label: "Z", sortOrder: 56, supports: [], fields: [{ slug: "name", label: "N", type: "string" }] });
	});
	assert.deepEqual(r.stops, []);
	const create = r.ops.find((o) => o.op === "createCollection" && o.collection.slug === "a_first");
	assert.deepEqual(create.fields, []);
	assert.ok(r.ops.findIndex((o) => o.op === "addField" && o.collection === "a_first") > r.ops.findIndex((o) => o.op === "createCollection" && o.collection.slug === "z_second"));
});

test("field rename -> AMBIGUOUS_FIELD_RENAME (no ops)", () => {
	const r = diff((seed) => {
		field(seed, "tours", "group_size").slug = "party_size";
	});
	assert.deepEqual(stopCodes(r), ["AMBIGUOUS_FIELD_RENAME"]);
	assert.deepEqual(r.ops, []);
	assert.equal(r.stops[0].details.candidates[0].removed, "group_size");
});

test("collection rename -> AMBIGUOUS_COLLECTION_RENAME", () => {
	const r = diff((seed) => {
		collection(seed, "training").slug = "corsi";
	});
	assert.deepEqual(stopCodes(r), ["AMBIGUOUS_COLLECTION_RENAME"]);
});

test("type, flag and reference changes -> STOP", () => {
	assert.deepEqual(stopCodes(diff((s) => (field(s, "tours", "price").type = "number"))), ["FIELD_TYPE_CHANGE_UNSUPPORTED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "tours", "price").required = true))), ["FIELD_FLAG_CHANGE_REFUSED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "tours", "title").required = false))), ["FIELD_FLAG_CHANGE_REFUSED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "tours", "price").unique = true))), ["FIELD_FLAG_CHANGE_REFUSED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "tours", "price").translatable = false))), ["FIELD_FLAG_CHANGE_REFUSED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "homepage", "featured_tours").validation.multiple = false))), ["REFERENCE_CHANGE_UNSUPPORTED"]);
	assert.deepEqual(stopCodes(diff((s) => (field(s, "homepage", "featured_tours").validation.targetCollection = "libri"))), ["REFERENCE_CHANGE_UNSUPPORTED"]);
	assert.deepEqual(stopCodes(diff((s) => delete field(s, "homepage", "form_heading_hero").defaultValue)), ["PROPERTY_NOT_CLEARABLE"]);
	assert.equal(diff((s) => (field(s, "tours", "price").type = "text")).stops.length, 0, "string -> text is fine");
	assert.equal(diff((s) => (field(s, "tours", "price").translatable = true)).stops.length, 0);
});

test("destructive changes are gated by allowDestructive and run in the post phase", () => {
	const mutate = (seed) => {
		collection(seed, "tours").fields = collection(seed, "tours").fields.filter((f) => f.slug !== "included");
		field(seed, "tours", "excerpt").label = "E";
	};
	assert.deepEqual(stopCodes(diff(mutate)), ["DESTRUCTIVE_NOT_ALLOWED"]);
	const ok = diff(mutate, { allowDestructive: true });
	assert.deepEqual(ok.stops, []);
	assert.deepEqual(ok.post, [{ op: "removeField", collection: "tours", field: "included" }]);
	assert.equal(ok.ops.at(-1).op, "removeField");
	const del = diff((seed) => {
		seed.collections = seed.collections.filter((c) => c.slug !== "training");
	}, { allowDestructive: true });
	assert.deepEqual(del.post, [{ op: "deleteCollection", collection: "training" }]);
});

test("removing a mid-collection field keeps the final order (reorder happens before the post removal)", () => {
	const r = diff((seed) => {
		const tours = collection(seed, "tours");
		tours.fields = tours.fields.filter((f) => f.slug !== "destination");
		tours.fields.unshift({ slug: "kicker", label: "Kicker", type: "string" });
	}, { renames: [{ collection: "tours", from: "destination", to: "kicker" }], allowDestructive: true });
	assert.deepEqual(r.stops, []);
	const reorder = r.ops.find((o) => o.op === "reorderFields");
	assert.ok(reorder.slugs.includes("destination"), "pre order still lists the field to be removed");
});

test("--rename emits the expand form: addField + copy backfill, post removeField", () => {
	const mutate = (seed) => {
		const f = field(seed, "tours", "group_size");
		f.slug = "party_size";
		f.required = false;
	};
	assert.deepEqual(stopCodes(diff(mutate, { renames: [{ collection: "tours", from: "group_size", to: "party_size" }] })), ["DESTRUCTIVE_NOT_ALLOWED"]);
	const r = diff(mutate, { renames: [{ collection: "tours", from: "group_size", to: "party_size" }], allowDestructive: true });
	assert.deepEqual(r.stops, []);
	assert.deepEqual(r.pre.map((o) => o.op), ["addField", "reorderFields"]);
	assert.deepEqual(r.post, [{ op: "removeField", collection: "tours", field: "group_size" }]);
	assert.deepEqual(r.backfills, [{ id: "tours-party_size", collection: "tours", to: "party_size", from: "group_size", transform: "copy", locales: "all" }]);
});

test("rename with a type change needs a module transform; required:true is allowed at creation", () => {
	const r = diff((seed) => {
		const f = field(seed, "tours", "price");
		f.slug = "amount";
		f.type = "number";
		f.required = true;
	}, { renames: [{ collection: "tours", from: "price", to: "amount" }], allowDestructive: true });
	assert.deepEqual(r.stops, []);
	assert.equal(r.backfills[0].transform, "module");
	assert.equal(r.pre.find((o) => o.op === "addField").field.required, true);
});

test("--resolve drop-add accepts remove + add", () => {
	const mutate = (seed) => {
		field(seed, "tours", "group_size").slug = "party_size";
	};
	const r = diff(mutate, { dropAdd: ["tours.group_size,tours.party_size"], allowDestructive: true });
	assert.deepEqual(r.stops, []);
	assert.deepEqual(r.backfills, []);
	assert.deepEqual(r.ops.map((o) => o.op), ["addField", "reorderFields", "removeField"].filter((x) => r.ops.some((o) => o.op === x)));
	const col = diff((seed) => {
		collection(seed, "training").slug = "corsi";
	}, { dropAdd: ["training,corsi"], allowDestructive: true });
	assert.deepEqual(col.stops, []);
	assert.ok(col.post.some((o) => o.op === "deleteCollection" && o.collection === "training"));
});

test("a removed slug may not come back (SLUG_REUSE), neither field nor collection", () => {
	const history = newHistory();
	history.fields.set("tours", new Set(["legacy"]));
	history.collections.add("old_things");
	const r = diff((seed) => {
		collection(seed, "tours").fields.push({ slug: "legacy", label: "L", type: "string" });
		seed.collections.push({ slug: "old_things", label: "O", supports: [], fields: [] });
	}, { history });
	assert.deepEqual(stopCodes(r), ["SLUG_REUSE", "SLUG_REUSE"]);
});

test("a rename that reuses a removed slug is also refused", () => {
	const history = newHistory();
	history.fields.set("tours", new Set(["party_size"]));
	const r = diff((seed) => {
		field(seed, "tours", "group_size").slug = "party_size";
	}, { renames: [{ collection: "tours", from: "group_size", to: "party_size" }], allowDestructive: true, history });
	assert.ok(stopCodes(r).includes("SLUG_REUSE"));
});

test("diff is deterministic", () => {
	const mutate = (seed) => {
		collection(seed, "tours").fields.push({ slug: "amount", label: "A", type: "number" });
		collection(seed, "libri").icon = "book";
	};
	assert.equal(JSON.stringify(diff(mutate).ops), JSON.stringify(diff(mutate).ops));
});
