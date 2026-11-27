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
 * Replay migrations from the empty schema.
 * -> { states, history, final, errors }
 * states[i] = { index, migration: id|null, phase: "base"|"pre"|"full", hash, canonical }
 *   base = S0 (empty); pre = S(i,pre), only present when the migration has both pre and post ops;
 *   full = S(i) after all ops (for a pre-only migration this is the state after its pre ops).
 * Stops at the first failing migration (errors say which). Duplicate hashes are errors (HASH_COLLISION).
 */
export function buildChain(migrations) {
	const errors = [];
	const history = newHistory();
	const states = [];
	const byHash = new Map();
	const push = (migration, phase, canonical) => {
		const hash = hashSchema(canonical);
		const state = { index: states.length, migration, phase, hash, canonical };
		const clash = byHash.get(hash);
		if (clash) {
			errors.push({
				code: "HASH_COLLISION",
				migration,
				message: `${migration ?? "S0"} (${phase}) has the same schema hash as ${clash.migration ?? "S0"} (${clash.phase}): the migration is a no-op or returns to an earlier state, so a live database cannot be located unambiguously`,
			});
		} else byHash.set(hash, state);
		states.push(state);
		return state;
	};
	let cur = emptyCanonical();
	push(null, "base", cur);
	for (const m of migrations) {
		try {
			const mid = applyOps(cur, m.preOps, { history });
			const bfErrors = checkBackfills(m, mid);
			if (bfErrors.length) {
				errors.push(...bfErrors);
				break;
			}
			const next = applyOps(mid, m.postOps, { history, offset: m.preOps.length });
			if (m.preOps.length && m.postOps.length) push(m.id, "pre", mid);
			push(m.id, "full", next);
			cur = next;
		} catch (e) {
			if (!(e instanceof ModelError)) throw e;
			errors.push({ code: e.code, migration: m.id, opIndex: e.opIndex, message: `${m.id}: ${e.message}` });
			break;
		}
	}
	return { states, history, final: states.at(-1), errors };
}

/** state whose hash equals `hash`, or null (-> DRIFT) */
export const locateInChain = (chain, hash) => chain.states.find((s) => s.hash === hash) ?? null;
