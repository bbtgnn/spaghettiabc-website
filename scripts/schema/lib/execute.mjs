/**
 * Deep module: run a `buildPlan` against a live EmDash server.
 *
 * One call walks every step (ops / backfill / gate), re-hashes after ops, and returns a structured outcome.
 * Expected apply failures (BLOCKED, DRIFT, REMOTE) are returned as `{ exit }`, not thrown.
 */
import { defaultLocaleOf, findBlockers, runBackfill } from "./backfill.mjs";
import { diffPaths } from "./canonical.mjs";
import { EXIT } from "./index.mjs";
import { applyOpLive } from "./live-ops.mjs";
import { describeOp } from "./model.mjs";
import { locate, positionAt } from "./position.mjs";
import { LoopError } from "./cli.mjs";
import { EmDashApiError } from "./server.mjs";

const short = (h) => h.slice(0, 12);
const fmtDiff = (diff, aName, bName) =>
	diff.slice(0, 25).map((d) => `    ${d.path}: ${aName}=${JSON.stringify(d.a)} ${bName}=${JSON.stringify(d.b)}`).join("\n")
	+ (diff.length > 25 ? `\n    … ${diff.length - 25} more` : "");

/**
 * @param {{
 *   server: { readLiveSchema: Function },
 *   plan: { steps: object[], notes?: string[] },
 *   positions: object[],
 *   migrations: object[],
 *   opts?: { verbose?: boolean, log?: (...args: any[]) => void },
 * }} args
 * @returns {Promise<{
 *   exit: number,
 *   steps: object[],
 *   ms?: number,
 *   finalLive?: { hash: string, position: string | null },
 * }>}
 */
export async function executePlan({ server, plan, positions, migrations, opts = {} }) {
	const log = opts.log ?? (() => {});
	const verbose = Boolean(opts.verbose);
	const byId = new Map(migrations.map((m) => [m.id, m]));
	const steps = [];
	let defaultLocale;
	const t0 = performance.now();

	for (const [i, step] of plan.steps.entries()) {
		const m = byId.get(step.migration);
		const label = `[${i + 1}/${plan.steps.length}]`;
		const started = performance.now();
		const rec = { step: i + 1, kind: step.kind, migration: step.migration };
		steps.push(rec);

		if (step.kind === "ops") {
			rec.ops = step.ops.map(describeOp);
			for (const [j, op] of step.ops.entries()) {
				try {
					await applyOpLive(server, op);
				} catch (e) {
					rec.failedOp = describeOp(op);
					rec.error = e.message;
					const after = await server.readLiveSchema().catch(() => null);
					const where = after ? locate(positions, after.hash) : null;
					rec.liveAfterFailure = where?.position.label ?? (after ? "not in chain" : "unknown");
					if (e instanceof EmDashApiError && e.code === "COLLECTION_HAS_CONTENT") {
						log(`BLOCKED: ${describeOp(op)} refused by the server: ${e.message}\n  The collection still has content; migrate or delete the entries first (apply never uses force).`);
						rec.blocked = "COLLECTION_HAS_CONTENT";
						return { exit: EXIT.BLOCKED, steps };
					}
					log(`FAILED ${label} ${step.label} op ${step.from + j + 1}/${m.ops.length} ${describeOp(op)}: ${e.status ?? ""} ${e.code ?? ""} ${e.message}\n  live is now: ${rec.liveAfterFailure} (re-run schema:apply to resume)`);
					return { exit: e instanceof LoopError ? e.exit : EXIT.REMOTE, steps };
				}
				if (verbose) log(`    ok ${describeOp(op)}`);
			}
			const expected = positionAt(positions, step.k, step.to);
			const after = await server.readLiveSchema();
			rec.liveHash = after.hash;
			rec.expectedHash = expected.hash;
			if (after.hash !== expected.hash) {
				const diff = diffPaths(expected.canonical, after.canonical);
				rec.diff = diff;
				log(`MISMATCH ${label} after ${step.label}: live ${short(after.hash)} != expected ${short(expected.hash)} (${expected.label}). The model and the server disagree, or the schema changed concurrently:\n${fmtDiff(diff, "expected", "live")}`);
				return { exit: EXIT.DRIFT, steps };
			}
			log(`${label} ${step.label} ok: ${step.ops.length} op${step.ops.length === 1 ? "" : "s"}, live == ${expected.label} (${Math.round(performance.now() - started)} ms)`);
		} else if (step.kind === "backfill") {
			defaultLocale ??= await defaultLocaleOf(server);
			const b = step.backfill;
			const res = await runBackfill(server, m, b, { defaultLocale, log: verbose ? (l) => log(`    ${l}`) : undefined });
			Object.assign(rec, res);
			const tally = Object.entries(res.byAction).map(([k, v]) => `${k}=${v}`).join(" ") || "no entries";
			if (res.errors.length) {
				for (const e of res.errors) log(`  ${b.collection}/${e.slug ?? e.id}: ${e.message}`);
				log(`FAILED ${label} backfill ${b.id}: ${res.errors.length} of ${res.entries} entries could not be processed (${tally}). Fix and re-run schema:apply (backfills are idempotent).`);
				return { exit: EXIT.REMOTE, steps };
			}
			log(`${label} backfill ${b.id}${step.catchUp ? " (catch-up)" : ""}: ${res.entries} entries, ${tally} (${Math.round(performance.now() - started)} ms)`);
		} else if (step.kind === "gate") {
			defaultLocale ??= await defaultLocaleOf(server);
			const blockers = [];
			for (const c of step.checks) for (const x of await findBlockers(server, c.backfill, { defaultLocale })) blockers.push({ field: c.field, ...x });
			rec.blockers = blockers;
			if (blockers.length) {
				log(`BLOCKED ${label}: removing ${step.checks.map((c) => c.field).join(", ")} would lose data; ${blockers.length} entr${blockers.length === 1 ? "y has" : "ies have"} a version without the backfilled value:`);
				for (const x of blockers) log(`  ${x.field.split(".")[0]}/${x.slug ?? x.id} (${x.id}, ${x.status}): ${x.reason}`);
				log("Nothing was removed. Fix the entries (publish/discard the draft or re-run the backfill) and re-run --phase post.");
				return { exit: EXIT.BLOCKED, steps };
			}
			log(`${label} gate ok: every entry carries the backfilled value (${Math.round(performance.now() - started)} ms)`);
		}
		rec.ms = Math.round(performance.now() - started);
	}

	const ms = Math.round(performance.now() - t0);
	const end = await server.readLiveSchema();
	const where = locate(positions, end.hash);
	const finalLive = { hash: end.hash, position: where?.position.label ?? null };
	log(`done in ${ms} ms: live == ${where?.position.label ?? `${short(end.hash)} (not in chain!)`}`);
	return { exit: EXIT.OK, steps, ms, finalLive };
}
