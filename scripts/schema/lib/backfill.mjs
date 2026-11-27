/**
 * Content backfills over the EmDash REST API (mechanics verified in tmp/spike/spike5-findings.md).
 *
 * Policy: STAGE-ONLY for entries with a pending editor draft (the value is written into the draft, never
 * published). Entries without a foreign pending draft are updated and then published (on revisioned collections
 * `update()` only stages a draft; the live columns change on publish). Never-published / scheduled / unpublished
 * entries are only staged, never published. Trashed entries: restore -> update -> delete.
 * Idempotent: skip when the target already holds a value (null/undefined/"" count as empty), and when there is
 * nothing to copy. Sequential, `_rev` guarded, a 409 re-reads the entry and retries.
 * Locales: `locales: "default"` only touches default-locale entries (non-translatable targets sync to siblings on
 * publish); `"all"` treats every locale entry on its own.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EmDashApiError } from "./server.mjs";
import { stableStringify } from "./index.mjs";

export const isEmpty = (v) => v === undefined || v === null || v === "";
const same = (a, b) => stableStringify(a) === stableStringify(b);
const without = (o, k) => {
	const c = { ...(o ?? {}) };
	delete c[k];
	return c;
};
const enc = encodeURIComponent;
const MAX_ATTEMPTS = 4;

/** -> async (value, entryData) => newValue (module transforms are loaded from `<migration>.backfill.mjs`) */
export async function loadTransform(migration, backfill) {
	if (backfill.transform === "copy") return async (value) => structuredClone(value);
	const file = path.join(path.dirname(migration.file), `${migration.id}.backfill.mjs`);
	const mod = await import(pathToFileURL(file).href);
	if (typeof mod.transform !== "function") throw new Error(`${file}: transform is not exported`);
	return async (value, entry) => mod.transform(structuredClone(value), structuredClone(entry));
}

/** all entries of a collection: live (all statuses, all locales) then trashed. Ids are materialised up front. */
export async function listEntries(server, collection, { defaultLocale, locales = "all" } = {}) {
	const out = [];
	const page = async (base, trashed) => {
		let cursor;
		do {
			const qs = new URLSearchParams({ limit: "100" });
			if (cursor) qs.set("cursor", cursor);
			const res = await server.request("GET", `${base}?${qs}`);
			for (const it of res.items ?? []) out.push({ id: it.id, slug: it.slug, status: it.status, locale: it.locale ?? null, trashed, data: it.data ?? {} });
			cursor = res.nextCursor;
		} while (cursor);
	};
	await page(`/content/${enc(collection)}`, false);
	await page(`/content/${enc(collection)}/trash`, true);
	return locales === "default" ? out.filter((e) => !e.locale || e.locale === defaultLocale) : out;
}

export async function defaultLocaleOf(server) {
	const man = await server.request("GET", "/manifest");
	return man?.contentLocale?.defaultLocale ?? null;
}

/** one entry's versions: { item, rev, live, draft } (`live`/`draft` are revision data or null) */
async function readEntry(server, collection, id) {
	const base = `/content/${enc(collection)}/${enc(id)}`;
	const got = await server.request("GET", base);
	const item = got.item;
	let cmp = { live: null, draft: null, hasChanges: false };
	try {
		cmp = await server.request("GET", `${base}/compare`);
	} catch (e) {
		if (!(e instanceof EmDashApiError) || e.status !== 404) throw e;
	}
	return {
		item,
		rev: got._rev,
		live: item.liveRevisionId ? (cmp.live ?? null) : null,
		draft: item.draftRevisionId ? (cmp.draft ?? null) : null,
	};
}

async function withRetry(fn) {
	for (let attempt = 1; ; attempt++) {
		try {
			return await fn();
		} catch (e) {
			if (e instanceof EmDashApiError && e.status === 409 && attempt < MAX_ATTEMPTS) continue;
			throw e;
		}
	}
}

async function processLive(server, e, b, xf) {
	const { to, from, collection } = b;
	const base = `/content/${enc(collection)}/${enc(e.id)}`;
	const { item, rev, live, draft } = await readEntry(server, collection, e.id);
	const draftExists = draft !== null;
	const published = item.status === "published" && live !== null;
	const stage = async (data, r) => (await server.request("PUT", `${base}`, { data: { [to]: data }, _rev: r }))._rev ?? r;

	if (published) {
		const ours = draftExists && same(without(draft, to), without(live, to));
		if (!draftExists || ours) {
			const want = await xf(live[from], live);
			if (isEmpty(want)) return "skip:no-source";
			const columnHas = draftExists ? true : !isEmpty(item.data?.[to]);
			if (!draftExists && !isEmpty(live[to]) && columnHas) return "skip:published-already";
			let r = rev;
			if (!(draftExists && same(draft[to], want))) r = await stage(want, r);
			await server.request("POST", `${base}/publish`, { _rev: r });
			return "published";
		}
		// foreign (editor) draft pending: stage only
		const want = await xf(draft[from], draft);
		if (isEmpty(want)) return "skip:no-source";
		if (!isEmpty(draft[to])) return "skip:editor-draft-already";
		await stage(want, rev);
		return "staged:editor-draft";
	}
	// draft / scheduled / unpublished / published-without-live-revision: stage only, never publish
	const version = draft ?? item.data ?? {};
	const want = await xf(version[from], version);
	if (isEmpty(want)) return "skip:no-source";
	if (!isEmpty(version[to])) return "skip:already";
	await stage(want, rev);
	return `staged:${item.status}`;
}

async function processTrashed(server, e, b, xf) {
	const { to, from, collection } = b;
	const base = `/content/${enc(collection)}/${enc(e.id)}`;
	let latest = null;
	try {
		const revs = await server.request("GET", `${base}/revisions`);
		latest = revs.items?.[0]?.data ?? null;
	} catch (err) {
		if (!(err instanceof EmDashApiError) || err.status !== 404) throw err;
	}
	const version = latest ?? e.data ?? {};
	const want = await xf(version[from], version);
	if (isEmpty(want)) return "skip:no-source";
	if (!isEmpty(version[to])) return "skip:trashed-already";
	await server.request("POST", `${base}/restore`);
	try {
		const got = await server.request("GET", base);
		await server.request("PUT", base, { data: { [to]: want }, _rev: got._rev });
	} finally {
		await server.request("DELETE", base);
	}
	return "staged:trashed";
}

/**
 * Run one backfill. -> { id, collection, entries, byAction, errors: [{id, slug, message}] }
 * `entries` limits the work (tests); `log` receives per-entry lines.
 */
export async function runBackfill(server, migration, b, { defaultLocale, log = () => {} } = {}) {
	const xf = await loadTransform(migration, b);
	const entries = await listEntries(server, b.collection, { defaultLocale, locales: b.locales });
	const byAction = {};
	const errors = [];
	for (const e of entries) {
		try {
			const action = await withRetry(() => (e.trashed ? processTrashed(server, e, b, xf) : processLive(server, e, b, xf)));
			byAction[action] = (byAction[action] ?? 0) + 1;
			log(`${b.collection}/${e.slug ?? e.id}: ${action}`);
		} catch (err) {
			byAction.error = (byAction.error ?? 0) + 1;
			errors.push({ id: e.id, slug: e.slug, message: `${err.status ?? ""} ${err.code ?? ""} ${err.message}`.trim() });
			log(`${b.collection}/${e.slug ?? e.id}: ERROR ${err.message}`);
		}
	}
	return { id: b.id, collection: b.collection, from: b.from, to: b.to, entries: entries.length, byAction, errors };
}

/**
 * Entries whose newest content version lacks `to` while `from` has a value, i.e. entries for which removing `from`
 * would lose data: pending drafts (the version that survives an editor publish) lacking the backfilled value, plus
 * published entries without a pending draft whose live value is missing. For an entry with a pending draft only the
 * draft counts (stage-only leaves its live value empty on purpose).
 * -> [{ id, slug, status, version, reason }]
 */
export async function findBlockers(server, b, { defaultLocale } = {}) {
	const entries = await listEntries(server, b.collection, { defaultLocale, locales: b.locales });
	const out = [];
	for (const e of entries) {
		let version;
		let kind;
		if (e.trashed) {
			let latest = null;
			try {
				latest = (await server.request("GET", `/content/${enc(b.collection)}/${enc(e.id)}/revisions`)).items?.[0]?.data ?? null;
			} catch (err) {
				if (!(err instanceof EmDashApiError) || err.status !== 404) throw err;
			}
			version = latest ?? e.data;
			kind = "trashed";
		} else {
			const r = await readEntry(server, b.collection, e.id);
			if (r.draft) {
				version = r.draft;
				kind = "pending-draft";
			} else {
				version = r.item.data ?? {};
				kind = r.live ? "live" : "unpublished";
			}
		}
		if (!isEmpty(version?.[b.from]) && isEmpty(version?.[b.to])) {
			out.push({ id: e.id, slug: e.slug, status: e.status, version: kind, reason: `${kind} version has ${b.from} but no ${b.to}` });
		}
	}
	return out;
}
