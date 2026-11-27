import { EmDashApiError } from "../lib/server.mjs";

/**
 * Minimal in-memory model of the EmDash content API for ONE revisioned collection (semantics from
 * tmp/spike/spike5-findings.md): update() only writes a draft revision, publish copies draft -> live columns,
 * restore always yields status "draft", trashed entries 404 on get/compare but expose /revisions.
 * `server.request(method, path, body)` has the same shape as lib/server.mjs `request`.
 */
export function fakeContent(collection, rows) {
	let seq = 0;
	const entries = rows.map((r) => ({
		id: r.id,
		slug: r.slug ?? r.id,
		status: r.status ?? "published",
		locale: r.locale ?? "en",
		trashed: Boolean(r.trashed),
		columns: { ...r.data },
		live: r.live === undefined ? (r.status ?? "published") === "published" ? { ...r.data } : null : r.live,
		draft: r.draft ?? null,
		revisions: [],
		version: 1,
	}));
	const log = [];
	let conflictOnce = new Set();
	const find = (id) => entries.find((e) => e.id === id);
	const item = (e) => ({
		id: e.id, slug: e.slug, status: e.status, locale: e.locale, version: e.version,
		liveRevisionId: e.live ? `l-${e.id}` : null, draftRevisionId: e.draft ? `d-${e.id}` : null,
		data: e.draft ? { ...e.draft } : { ...e.columns },
	});
	const listItem = (e) => ({ ...item(e), data: e.status === "published" ? { ...e.columns } : item(e).data });
	const notFound = () => new EmDashApiError(404, "NOT_FOUND", "not found");
	const checkRev = (e, rev) => {
		if (conflictOnce.has(e.id)) {
			conflictOnce.delete(e.id);
			e.version += 1; // someone else wrote meanwhile
			throw new EmDashApiError(409, "CONFLICT", "Content has been modified since last read (version conflict)");
		}
		if (rev !== undefined && rev !== `v${e.version}`) throw new EmDashApiError(409, "CONFLICT", "Content has been modified since last read (version conflict)");
	};
	const request = async (method, path, body) => {
		const url = new URL(path, "http://x");
		const m = /^\/content\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(url.pathname);
		if (!m || m[1] !== collection) throw new Error(`fake: unhandled ${method} ${path}`);
		const [, , a, b] = m;
		log.push(`${method} ${url.pathname}`);
		if (method === "GET" && a === undefined) return { items: entries.filter((e) => !e.trashed).map(listItem) };
		if (method === "GET" && a === "trash") return { items: entries.filter((e) => e.trashed).map(listItem) };
		const e = find(a);
		if (!e) throw notFound();
		if (method === "GET" && b === "revisions") return { items: [...e.revisions].reverse().map((data) => ({ data })).concat(e.live ? [{ data: e.live }] : []) };
		if (e.trashed && method === "POST" && b === "restore") {
			e.trashed = false;
			e.status = "draft";
			e.live = null;
			return {};
		}
		if (e.trashed) throw notFound();
		if (method === "GET" && b === undefined) return { item: item(e), _rev: `v${e.version}` };
		if (method === "GET" && b === "compare") return { hasChanges: Boolean(e.draft), live: e.live, draft: e.draft };
		if (method === "PUT" && b === undefined) {
			checkRev(e, body._rev);
			e.draft = { ...(e.draft ?? e.live ?? e.columns), ...body.data };
			e.revisions.push(e.draft);
			e.version += 1;
			return { item: item(e), _rev: `v${e.version}` };
		}
		if (method === "POST" && b === "publish") {
			checkRev(e, body?._rev);
			if (e.draft) {
				e.live = e.draft;
				e.columns = { ...e.draft };
				e.draft = null;
			}
			e.status = "published";
			e.version += 1;
			return {};
		}
		if (method === "DELETE" && b === undefined) {
			e.trashed = true;
			return undefined;
		}
		throw new Error(`fake: unhandled ${method} ${path}`);
	};
	return {
		entries, log, find,
		conflictOnce: (id) => conflictOnce.add(id),
		server: { request },
		resetLog: () => (log.length = 0),
		snapshot: () => JSON.stringify(entries.map((e) => [e.id, e.status, e.trashed, e.version, e.columns, e.live, e.draft])),
		nextId: () => `n${++seq}`,
	};
}
