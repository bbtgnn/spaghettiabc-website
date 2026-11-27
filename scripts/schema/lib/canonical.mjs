import { CANONICAL_VERSION, normalizeCollection, sortCollections } from "./model.mjs";
import { stableStringify } from "./hash.mjs";

const finish = (collections) => ({ v: CANONICAL_VERSION, collections: sortCollections(collections) });

/** seed object (`{collections}`) or a bare collections array -> canonical */
export function canonicalFromSeed(seedOrCollections) {
	const list = Array.isArray(seedOrCollections) ? seedOrCollections : (seedOrCollections.collections ?? []);
	return finish(list.map((c) => normalizeCollection(c)));
}

/** array of `EmDashClient.collection(slug)` results (`GET /schema/collections/:slug?includeFields=true`) -> canonical */
export function canonicalFromLive(collections) {
	return finish(collections.map((c) => normalizeCollection(c, { live: true })));
}

/** Path-level diff of two JSON docs for failure output: `[{path, a, b}]` (keyed by `slug` inside arrays). */
export function diffPaths(a, b, path = "", out = []) {
	if (stableStringify(a) === stableStringify(b)) return out;
	const isObj = (x) => x && typeof x === "object";
	if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
		out.push({ path: path || "$", a, b });
		return out;
	}
	if (Array.isArray(a) && a.every((x) => x?.slug) && b.every((x) => x?.slug)) {
		const slugs = [...new Set([...a.map((x) => x.slug), ...b.map((x) => x.slug)])];
		for (const s of slugs) diffPaths(a.find((x) => x.slug === s), b.find((x) => x.slug === s), `${path}[${s}]`, out);
		const order = (x) => x.map((y) => y.slug);
		if (order(a).join() !== order(b).join() && order(a).length === order(b).length && slugs.length === order(a).length)
			out.push({ path: `${path}#order`, a: order(a), b: order(b) });
		return out;
	}
	for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPaths(a[k], b[k], `${path}${Array.isArray(a) ? `[${k}]` : `.${k}`}`, out);
	return out;
}
