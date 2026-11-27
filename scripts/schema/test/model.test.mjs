import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelError, applyOps, canonicalFromSeed, hashSchema, isDestructive, newHistory, phaseOf, splitOps } from "../lib/index.mjs";
import { fixtureSeed } from "./util.mjs";

const base = () => canonicalFromSeed(fixtureSeed());
const code = (ops, canon = base(), history) => {
	try {
		applyOps(canon, ops, { history });
	} catch (e) {
		assert.ok(e instanceof ModelError, String(e));
		return e.code;
	}
	return null;
};
const upd = (collection, field, set) => ({ op: "updateField", collection, field, set });

test("phases: removeField/deleteCollection are post, everything else pre", () => {
	assert.equal(phaseOf({ op: "removeField" }), "post");
	assert.equal(phaseOf({ op: "deleteCollection" }), "post");
	for (const op of ["createCollection", "updateCollection", "reorderCollections", "addField", "updateField", "reorderFields"]) assert.equal(phaseOf({ op }), "pre");
	assert.ok(isDestructive({ op: "removeField" }) && !isDestructive({ op: "addField" }));
	const split = splitOps([{ op: "addField" }, { op: "removeField" }, { op: "updateField" }]);
	assert.equal(split.ordered, false);
	assert.equal(splitOps([{ op: "addField" }, { op: "removeField" }]).ordered, true);
});

test("refusal rules carry the server's error codes", () => {
	assert.equal(code([upd("tours", "price", { type: "number" })]), "FIELD_TYPE_COLUMN_CHANGE");
	assert.equal(code([upd("tours", "price", { type: "integer" })]), "FIELD_TYPE_COLUMN_CHANGE");
	assert.equal(code([upd("tours", "price", { type: "portableText" })]), "FIELD_TYPE_COLUMN_CHANGE");
	assert.equal(code([upd("tours", "excerpt", { type: "string" })]), null, "text -> string is allowed");
	assert.equal(code([upd("tours", "price", { type: "slug" })]), null, "string -> slug is allowed");
	assert.equal(code([upd("tours", "price", { type: "url" })]), "FIELD_TYPE_CHANGE_REQUIRES_MIGRATION", "same column, not text alias");
	assert.equal(code([upd("tours", "price", { required: true })]), "FIELD_UPDATE_REQUIRES_MIGRATION");
	assert.equal(code([upd("tours", "title", { required: false })]), "FIELD_UPDATE_REQUIRES_MIGRATION");
	assert.equal(code([upd("tours", "price", { unique: true })]), "FIELD_UPDATE_REQUIRES_MIGRATION");
	assert.equal(code([upd("tours", "price", { translatable: false })]), "FIELD_UPDATE_REQUIRES_MIGRATION");
	assert.equal(code([upd("tours", "price", { required: false, unique: false, translatable: true, label: "Prezzo" })]), null, "same values are no-ops");
	const canon = applyOps(base(), [{ op: "addField", collection: "tours", field: { slug: "nt", label: "NT", type: "string", translatable: false } }]);
	assert.equal(code([upd("tours", "nt", { translatable: true })], canon), null, "false -> true is allowed");
	assert.equal(code([upd("homepage", "featured_tours", { type: "string" })]), "FIELD_TYPE_COLUMN_CHANGE", "reference is storage-less");
	assert.equal(code([upd("homepage", "featured_tours", { validation: { targetCollection: "libri", multiple: true } })]), "VALIDATION_ERROR");
	assert.equal(code([upd("homepage", "featured_tours", { validation: { targetCollection: "tours", multiple: false } })]), "REFERENCE_CHANGE_UNSUPPORTED");
});

test("structural rules", () => {
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "price", label: "P", type: "string" } }]), "FIELD_EXISTS");
	assert.equal(code([{ op: "addField", collection: "nope", field: { slug: "x", label: "X", type: "string" } }]), "COLLECTION_NOT_FOUND");
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "Bad-Slug", label: "X", type: "string" } }]), "INVALID_SLUG");
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "status", label: "X", type: "string" } }]), "RESERVED_SLUG");
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "x", label: "X", type: "nope" } }]), "VALIDATION_ERROR");
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "x", label: "X", type: "string", bogus: 1 } }]), "VALIDATION_ERROR");
	assert.equal(code([{ op: "addField", collection: "tours", field: { slug: "x", label: "X", type: "reference", validation: { targetCollection: "ghost" } } }]), "REFERENCE_TARGET_NOT_FOUND");
	assert.equal(code([{ op: "removeField", collection: "tours", field: "ghost" }]), "FIELD_NOT_FOUND");
	assert.equal(code([{ op: "updateCollection", collection: "tours", set: { titleField: "price_missing" } }]), "INVALID_TITLE_FIELD");
	assert.equal(code([{ op: "updateCollection", collection: "tours", set: { titleField: "gallery" } }]), "INVALID_TITLE_FIELD");
	assert.equal(code([{ op: "reorderFields", collection: "tours", slugs: ["title"] }]), "REORDER_MISMATCH");
	assert.equal(code([{ op: "reorderCollections", slugs: ["tours", "tours"] }]), "DUPLICATE_SLUG");
	assert.equal(code([{ op: "reorderCollections", slugs: ["ghost"] }]), "COLLECTION_NOT_FOUND");
	assert.equal(code([{ op: "deleteCollection", collection: "tours" }]), "COLLECTION_REFERENCED");
	assert.equal(code([{ op: "createCollection", collection: { slug: "tours", label: "T", supports: [] }, fields: [] }]), "COLLECTION_EXISTS");
	assert.equal(code([{ op: "createCollection", collection: { slug: "media", label: "T", supports: [] }, fields: [] }]), "RESERVED_SLUG");
	assert.equal(code([{ op: "createCollection", collection: { slug: "eventi", label: "E" }, fields: [] }]), "VALIDATION_ERROR", "supports must be explicit");
	assert.equal(code([{ op: "frobnicate" }]), "VALIDATION_ERROR");
});

test("admin cannot be cleared; null clears clearable keys only", () => {
	const withAdmin = applyOps(base(), [{ op: "updateCollection", collection: "tours", set: { admin: { quickCreate: true }, group: "g" } }]);
	assert.equal(code([{ op: "updateCollection", collection: "tours", set: { admin: null } }], withAdmin), "PROPERTY_NOT_CLEARABLE");
	const cleared = applyOps(withAdmin, [{ op: "updateCollection", collection: "tours", set: { group: null } }]);
	assert.equal(cleared.collections.find((c) => c.slug === "tours").group, undefined);
	assert.equal(code([{ op: "updateCollection", collection: "tours", set: { label: null } }]), "VALIDATION_ERROR");
	const nulled = applyOps(base(), [upd("tours", "price", { defaultValue: null })]);
	assert.equal(nulled.collections.find((c) => c.slug === "tours").fields.find((f) => f.slug === "price").defaultValue, null, "defaultValue null is a literal");
});

test("slug reuse: a removed field/collection slug can never come back", () => {
	const history = newHistory();
	const removed = applyOps(base(), [{ op: "removeField", collection: "tours", field: "included" }], { history });
	const readd = [{ op: "addField", collection: "tours", field: { slug: "included", label: "I", type: "string" } }];
	assert.equal(code(readd, removed, history), "SLUG_REUSE");
	assert.equal(code(readd, removed, newHistory()), null, "without history it is a plain add (the chain supplies history)");
	const gone = newHistory();
	gone.collections.add("eventi");
	assert.equal(code([{ op: "createCollection", collection: { slug: "eventi", label: "E", supports: [] }, fields: [] }], base(), gone), "SLUG_REUSE");
});

test("removeField clears titleField; createCollection with fields and titleField works", () => {
	const canon = applyOps(base(), [
		{ op: "createCollection", collection: { slug: "eventi", label: "Eventi", supports: ["drafts"], titleField: "name", sortOrder: 60 }, fields: [{ slug: "name", label: "Nome", type: "string" }, { slug: "venue", label: "Venue", type: "reference", validation: { targetCollection: "eventi" } }] },
	]);
	const e = canon.collections.find((c) => c.slug === "eventi");
	assert.equal(e.titleField, "name");
	assert.equal(canon.collections.at(-1).slug, "eventi");
	const after = applyOps(canon, [{ op: "removeField", collection: "eventi", field: "name" }]);
	assert.equal(after.collections.find((c) => c.slug === "eventi").titleField, undefined);
	assert.notEqual(hashSchema(canon), hashSchema(after));
});

test("reorderCollections: listed get their index, others are cleared", () => {
	const canon = applyOps(base(), [{ op: "reorderCollections", slugs: ["tours", "homepage"] }]);
	assert.deepEqual(canon.collections.map((c) => [c.slug, c.sortOrder]).slice(0, 2), [["tours", 0], ["homepage", 1]]);
	assert.ok(canon.collections.slice(2).every((c) => c.sortOrder === undefined));
});

test("applyOps is pure", () => {
	const canon = base();
	const snapshot = JSON.stringify(canon);
	applyOps(canon, [{ op: "removeField", collection: "tours", field: "included" }]);
	assert.equal(JSON.stringify(canon), snapshot);
});
