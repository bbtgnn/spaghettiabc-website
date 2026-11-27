/**
 * Migration ops -> EmDash 1.6.0 schema REST calls (HTTP, public API surface only).
 *
 * Notes (see tmp/spike/offline/FINDINGS.md):
 *  - the REST create body drops titleField/dateField/commentsEnabled -> follow-up PUT once the fields exist;
 *  - `supports` is always sent explicitly (REST default ["drafts","revisions"] != seed default []);
 *  - `null` in `set` means "clear": the value to send is CLEARABLE_*;
 *  - removing a reference field also deletes its relation (`?deleteRelation=true`);
 *  - deleteCollection never sends `force`: a collection with content is refused (COLLECTION_HAS_CONTENT).
 *
 * REST body projection lives in project.mjs; this module only sequences HTTP calls.
 */
import { EXIT, LoopError } from "./errors.mjs";
import {
	collectionCreateBodies, collectionUpdateBody, fieldCreateBody, fieldUpdateBody,
} from "./project.mjs";

const enc = encodeURIComponent;

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
