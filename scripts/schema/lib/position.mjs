/**
 * Where is a live database in the migration chain?
 *
 * A position is `{ k, n }`: migrations[0..k-1] are fully applied and the first `n` ops of migrations[k] are applied.
 * `{k: 0, n: 0}` is the empty schema; `{k: migrations.length, n: 0}` is "everything applied".
 * Positions are matched by schema hash, complete chain states first (S0, S(i,pre), S(i)), then every other
 * op-prefix of a migration. An op-prefix match means an earlier apply was interrupted mid-migration (a failed
 * op leaves exactly that state), so the applier can resume. No match at all = DRIFT.
 *
 * `buildPositions` is the deep module: one replay builds every op-prefix plus the coarse chain view
 * (base / pre / full). Duplicate hashes are HASH_COLLISION; backfills are checked after each migration's pre ops.
 */
import { diffPaths } from "./canonical.mjs";
import { hashSchema } from "./hash.mjs";
import { FIELD_TYPE_TO_COLUMN, ModelError, TEXT_ALIAS_TYPES, applyOps, emptyCanonical, newHistory } from "./model.mjs";

/** state-dependent backfill checks against the schema after the migration's pre ops */
function checkBackfills(m, mid) {
	const errors = [];
	for (const b of m.backfills) {
		const err = (message) => errors.push({ code: "BACKFILL_INVALID", migration: m.id, message: `${m.id}: backfill "${b.id}": ${message}` });
		const col = mid.collections.find((c) => c.slug === b.collection);
		if (!col) {
			err(`collection "${b.collection}" does not exist`);
			continue;
		}
		const to = col.fields.find((f) => f.slug === b.to);
		const from = col.fields.find((f) => f.slug === b.from);
		if (!to) err(`target field "${b.collection}.${b.to}" does not exist after the pre ops`);
		if (!from) err(`source field "${b.collection}.${b.from}" does not exist after the pre ops`);
		if (!to || !from) continue;
		if (!to.translatable && b.locales !== "default") err(`target "${b.to}" is not translatable: locales must be "default"`);
		const sameKind = from.type === to.type || (TEXT_ALIAS_TYPES.has(from.type) && TEXT_ALIAS_TYPES.has(to.type));
		if (b.transform === "copy" && !sameKind) err(`copy between ${from.type} and ${to.type} needs transform "module"`);
		if (FIELD_TYPE_TO_COLUMN[to.type] === undefined) err(`unknown target type ${to.type}`);
	}
	return errors;
}

/**
 * Replay migrations from the empty schema, recording every op-prefix.
 * -> { positions, history, final, errors }
 * positions[i] = { k, n, hash, canonical, kind: "base"|"pre"|"full"|"partial", label }
 * Stops at the first failing migration (ModelError / invalid backfill). Duplicate hashes are HASH_COLLISION
 * (recorded, replay continues). `final` is the last successful complete position (kind full, or base if empty);
 * if errors stop the replay mid-way, `final` is the last pushed position before failure.
 */
export function buildPositions(migrations) {
	const errors = [];
	const history = newHistory();
	const positions = [];
	const byHash = new Map();
	const push = (entry) => {
		const clash = byHash.get(entry.hash);
		if (clash) {
			errors.push({
				code: "HASH_COLLISION",
				migration: entry.kind === "base" ? null : migrations[entry.k]?.id ?? null,
				message: `${entry.label} has the same schema hash as ${clash.label}: the migration is a no-op or returns to an earlier state, so a live database cannot be located unambiguously`,
			});
		} else byHash.set(entry.hash, entry);
		positions.push(entry);
		return entry;
	};

	let cur = emptyCanonical();
	push({ k: 0, n: 0, hash: hashSchema(cur), canonical: cur, kind: "base", label: "S0 (empty schema)" });
	let stopped = false;

	outer: for (const [k, m] of migrations.entries()) {
		if (m.preOps.length === 0) {
			const bfErrors = checkBackfills(m, cur);
			if (bfErrors.length) {
				errors.push(...bfErrors);
				stopped = true;
				break;
			}
		}
		let st = cur;
		for (const [i, op] of m.ops.entries()) {
			try {
				st = applyOps(st, [op], { history, offset: i });
			} catch (e) {
				if (!(e instanceof ModelError)) throw e;
				errors.push({ code: e.code, migration: m.id, opIndex: e.opIndex, message: `${m.id}: ${e.message}` });
				stopped = true;
				break outer;
			}
			const n = i + 1;
			if (n === m.preOps.length && m.preOps.length > 0) {
				const bfErrors = checkBackfills(m, st);
				if (bfErrors.length) {
					errors.push(...bfErrors);
					stopped = true;
					break outer;
				}
			}
			const last = n === m.ops.length;
			const kind = last ? "full" : n === m.preOps.length && m.postOps.length ? "pre" : "partial";
			const label = last ? `${m.id} (applied)` : kind === "pre" ? `${m.id} (pre ops applied)` : `${m.id} (interrupted after op ${n}/${m.ops.length})`;
			push({ k, n, hash: hashSchema(st), canonical: st, kind, label });
		}
		cur = st;
	}

	const lastComplete = [...positions].reverse().find((p) => p.kind === "full" || p.kind === "base");
	const final = stopped ? positions.at(-1) : lastComplete;
	return { positions, history, final, errors };
}

/** coarse chain view of a `buildPositions` result (base / pre / full only) */
export function chainFromBuilt(built, migrations) {
	const states = [];
	for (const p of built.positions) {
		if (p.kind !== "base" && p.kind !== "pre" && p.kind !== "full") continue;
		states.push({
			index: states.length,
			migration: p.kind === "base" ? null : migrations[p.k].id,
			phase: p.kind,
			hash: p.hash,
			canonical: p.canonical,
		});
	}
	return { states, history: built.history, final: states.at(-1), errors: built.errors };
}

/**
 * Compatibility: replay as a coarse chain { states, history, final, errors }.
 * states[i] = { index, migration: id|null, phase: "base"|"pre"|"full", hash, canonical }
 */
export function buildChain(migrations) {
	return chainFromBuilt(buildPositions(migrations), migrations);
}

/** state whose hash equals `hash`, or null (-> DRIFT) */
export const locateInChain = (chain, hash) => chain.states.find((s) => s.hash === hash) ?? null;

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
