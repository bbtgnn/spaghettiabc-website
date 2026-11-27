/**
 * Project migration ops / sets onto EmDash schema REST bodies.
 *
 * Clearability truth lives in model.mjs (`CLEARABLE_*`); this module only turns a `set`
 * (with `null` meaning clear) into the JSON body the REST update must send.
 */
import {
	CLEARABLE_COLLECTION_KEYS, CLEARABLE_FIELD_KEYS, normalizeCollection, normalizeField,
} from "./model.mjs";
import { EXIT, LoopError } from "./errors.mjs";

const COLLECTION_CREATE_KEYS = [
	"slug", "label", "labelSingular", "description", "icon", "admin", "supports", "urlPattern", "routable", "hidden",
	"sortOrder", "editLocking", "group",
];

export function fieldCreateBody(f) {
	const n = normalizeField(f);
	const body = {
		slug: n.slug, label: n.label, type: n.type, required: n.required, unique: n.unique, searchable: n.searchable,
		indexed: n.indexed, translatable: n.translatable, validation: n.validation ?? null,
	};
	if ("defaultValue" in n) body.defaultValue = n.defaultValue;
	if (n.widget !== undefined) body.widget = n.widget;
	if (n.options !== undefined) body.options = n.options;
	return body;
}

export function collectionCreateBodies(op) {
	const n = normalizeCollection({ ...op.collection, fields: [] });
	const create = {};
	for (const k of COLLECTION_CREATE_KEYS) if (n[k] !== undefined) create[k] = n[k];
	const follow = {};
	if (n.commentsEnabled) follow.commentsEnabled = true;
	for (const k of ["titleField", "dateField"]) if (n[k] !== undefined) follow[k] = n[k];
	return { create, follow };
}

function clearing(set, clearable, extra = {}) {
	const body = {};
	for (const [k, v] of Object.entries(set)) {
		if (v !== null) body[k] = v;
		else if (k in clearable) body[k] = clearable[k];
		else if (k in extra) body[k] = extra[k];
		else throw new LoopError(EXIT.USAGE, "OP_NOT_APPLICABLE", `cannot send null for "${k}"`);
	}
	return body;
}

/** -> body of the REST update that implements `updateCollection.set` */
export function collectionUpdateBody(set) {
	const body = clearing(set, CLEARABLE_COLLECTION_KEYS);
	delete body.hasSeo; // derived from `supports` by the server
	return body;
}

/** -> body of the REST update that implements `updateField.set` (`defaultValue: null` is the literal null) */
export const fieldUpdateBody = (set) => clearing(set, CLEARABLE_FIELD_KEYS, { defaultValue: null });
