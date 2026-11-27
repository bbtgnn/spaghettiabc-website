/**
 * Migration ops -> EmDash 1.6.0 schema REST calls (HTTP, public API surface only).
 *
 * Notes (see tmp/spike/offline/FINDINGS.md):
 *  - the REST create body drops titleField/dateField/commentsEnabled -> follow-up PUT once the fields exist;
 *  - `supports` is always sent explicitly (REST default ["drafts","revisions"] != seed default []);
 *  - `null` in `set` means "clear": the value to send is CLEARABLE_*;
 *  - removing a reference field also deletes its relation (`?deleteRelation=true`);
 *  - deleteCollection never sends `force`: a collection with content is refused (COLLECTION_HAS_CONTENT).
 */
import {
	CLEARABLE_COLLECTION_KEYS, CLEARABLE_FIELD_KEYS, EXIT, normalizeCollection, normalizeField,
} from "./index.mjs";
import { LoopError } from "./cli.mjs";
import { EmDashApiError } from "./server.mjs";

const enc = encodeURIComponent;
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

/** apply one op over HTTP. Throws EmDashApiError (server refusal) or LoopError. */
export async function applyOpLive(server, op) {
	const r = server.request;
	switch (op.op) {
		case "createCollection": {
			const { create, follow } = collectionCreateBodies(op);
			await r("POST", "/schema/collections", create);
			for (const f of op.fields) await r("POST", `/schema/collections/${enc(op.collection.slug)}/fields`, fieldCreateBody(f));
			if (Object.keys(follow).length) await r("PUT", `/schema/collections/${enc(op.collection.slug)}`, follow);
			return;
		}
		case "updateCollection":
			await r("PUT", `/schema/collections/${enc(op.collection)}`, collectionUpdateBody(op.set));
			return;
		case "deleteCollection":
			await r("DELETE", `/schema/collections/${enc(op.collection)}`);
			return;
		case "reorderCollections":
			await r("POST", "/schema/collections/reorder", { slugs: op.slugs });
			return;
		case "addField":
			await r("POST", `/schema/collections/${enc(op.collection)}/fields`, fieldCreateBody(op.field));
			return;
		case "updateField":
			await r("PUT", `/schema/collections/${enc(op.collection)}/fields/${enc(op.field)}`, fieldUpdateBody(op.set));
			return;
		case "removeField": {
			const col = await server.client.collection(op.collection);
			const isRef = col.fields?.find((f) => f.slug === op.field)?.type === "reference";
			await r("DELETE", `/schema/collections/${enc(op.collection)}/fields/${enc(op.field)}${isRef ? "?deleteRelation=true" : ""}`);
			return;
		}
		case "reorderFields":
			await r("POST", `/schema/collections/${enc(op.collection)}/fields/reorder`, { fieldSlugs: op.slugs });
			return;
		default:
			throw new LoopError(EXIT.USAGE, "UNKNOWN_OP", `unknown op ${op.op}`);
	}
}

export { EmDashApiError };
