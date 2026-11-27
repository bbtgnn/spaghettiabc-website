/**
 * Where is a live database in the migration chain?
 *
 * A position is `{ k, n }`: migrations[0..k-1] are fully applied and the first `n` ops of migrations[k] are applied.
 * `{k: 0, n: 0}` is the empty schema; `{k: migrations.length, n: 0}` is "everything applied".
 * Positions are matched by schema hash, complete chain states first (S0, S(i,pre), S(i)), then every other
 * op-prefix of a migration. An op-prefix match means an earlier apply was interrupted mid-migration (a failed
 * op leaves exactly that state), so the applier can resume. No match at all = DRIFT.
 */
import { applyOps, diffPaths, emptyCanonical, hashSchema, newHistory } from "./index.mjs";

/** -> [{ k, n, hash, canonical, kind: "base"|"pre"|"full"|"partial", label }] in chain order */
export function buildPositions(migrations) {
	const out = [];
	const history = newHistory();
	let cur = emptyCanonical();
	out.push({ k: 0, n: 0, hash: hashSchema(cur), canonical: cur, kind: "base", label: "S0 (empty schema)" });
	for (const [k, m] of migrations.entries()) {
		let st = cur;
		for (const [i, op] of m.ops.entries()) {
			st = applyOps(st, [op], { history, offset: i });
			const n = i + 1;
			const last = n === m.ops.length;
			const kind = last ? "full" : n === m.preOps.length && m.postOps.length ? "pre" : "partial";
			const label = last ? `${m.id} (applied)` : kind === "pre" ? `${m.id} (pre ops applied)` : `${m.id} (interrupted after op ${n}/${m.ops.length})`;
			out.push({ k, n, hash: hashSchema(st), canonical: st, kind, label });
		}
		cur = st;
	}
	return out;
}

/**
 * -> { k, n, position, exact } | null. `k`/`n` are normalised ("migration k applied" == "migration k+1 not started");
 * `exact` is false for an interrupted migration (op-prefix match).
 */
export function locate(positions, hash) {
	const rank = { base: 0, pre: 0, full: 0, partial: 1 };
	const hits = positions.filter((p) => p.hash === hash).sort((a, b) => rank[a.kind] - rank[b.kind] || a.k - b.k || a.n - b.n);
	const p = hits[0];
	if (!p) return null;
	return { k: p.kind === "full" ? p.k + 1 : p.k, n: p.kind === "full" ? 0 : p.n, position: p, exact: p.kind !== "partial" };
}

/** the position whose canonical schema is closest to `canonical` (fewest differing paths) -> { position, diff } */
export function nearest(positions, canonical) {
	let best = null;
	for (const p of positions) {
		const diff = diffPaths(p.canonical, canonical);
		if (!best || diff.length < best.diff.length) best = { position: p, diff };
	}
	return best;
}

export const positionAt = (positions, k, n) => positions.find((p) => p.k === k && p.n === n) ?? (n === 0 ? positions.find((p) => p.kind === "full" && p.k === k - 1) : undefined);
