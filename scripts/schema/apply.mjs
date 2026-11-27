#!/usr/bin/env node
/**
 * schema:apply --url <url> [--phase pre|post|all] [--dry-run] [--json]
 *
 * Reads the live schema over HTTP, locates it in the migration chain (hash), and applies the remaining steps of the
 * requested phase: pre ops -> backfills -> (code deploy) -> post ops. After every ops step the live schema is re-read
 * and its hash must equal the expected chain state.
 * Auth: EMDASH_TOKEN, or dev bypass for localhost.  Env: SCHEMA_REPO_ROOT (tests).
 * Exit: 0 ok · 1 seed/migrations inconsistent · 2 usage · 4 DRIFT / state mismatch · 5 blocked · 6 API error.
 */
import { pathToFileURL } from "node:url";
import { EXIT, describeOp, diffPaths } from "./lib/index.mjs";
import { loadChainOrFail } from "./lib/context.mjs";
import { defaultLocaleOf, findBlockers, runBackfill } from "./lib/backfill.mjs";
import { applyOpLive } from "./lib/live-ops.mjs";
import { buildPlan, describeStep } from "./lib/plan.mjs";
import { locate, nearest, positionAt } from "./lib/position.mjs";
import { EmDashApiError, LoopError, connect, parseArgs, run } from "./lib/server.mjs";

const USAGE = "node scripts/schema/apply.mjs --url <url> [--phase pre|post|all] [--dry-run] [--json] [--verbose]";

const short = (h) => h.slice(0, 12);
const fmtDiff = (diff, aName, bName) => diff.slice(0, 25).map((d) => `    ${d.path}: ${aName}=${JSON.stringify(d.a)} ${bName}=${JSON.stringify(d.b)}`).join("\n") + (diff.length > 25 ? `\n    … ${diff.length - 25} more` : "");

export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { url: "string", phase: "string", "dry-run": "boolean", json: "boolean", verbose: "boolean" }, USAGE);
	if (!opts.url) throw new LoopError(EXIT.USAGE, "USAGE", `--url is required\nusage: ${USAGE}`);
	const phase = opts.phase ?? "all";
	if (!["pre", "post", "all"].includes(phase)) throw new LoopError(EXIT.USAGE, "USAGE", `--phase must be pre, post or all\nusage: ${USAGE}`);
	const json = Boolean(opts.json);
	const dryRun = Boolean(opts["dry-run"]);
	const say = (...a) => (json ? console.error(...a) : console.log(...a));
	const result = { ok: false, url: undefined, phase, dryRun, auth: undefined, live: undefined, target: undefined, steps: [], notes: [] };
	const finish = (exit) => {
		result.ok = exit === EXIT.OK;
		result.exit = exit;
		if (json) console.log(JSON.stringify(result, null, 2));
		return exit;
	};

	const { migrations, chain, positions } = loadChainOrFail();
	const server = await connect({ url: opts.url });
	result.url = server.baseUrl;
	result.auth = server.auth;
	say(`schema:apply ${server.baseUrl} (phase ${phase}, auth ${server.auth}${dryRun ? ", dry run" : ""})`);

	const live = await server.readLiveSchema();
	const loc = locate(positions, live.hash);
	if (!loc) {
		const near = nearest(positions, live.canonical);
		result.live = { hash: live.hash, position: null };
		result.drift = { nearest: near.position.label, diff: near.diff };
		say(`DRIFT: live schema ${short(live.hash)} is not in the migration chain. Nearest: ${near.position.label}\n${fmtDiff(near.diff, "chain", "live")}\nFirst deploy against a pre-i18n staging? See DEPLOY.md > Schema changes > First deploy (wipe + reseed staging, or the expand pattern).`);
		return finish(EXIT.DRIFT);
	}
	result.live = { hash: live.hash, position: loc.position.label, interrupted: !loc.exact };
	result.target = { hash: chain.final.hash, migration: migrations.at(-1)?.id ?? null };
	say(`live ${short(live.hash)} = ${loc.position.label}; target ${short(chain.final.hash)} = ${result.target.migration ?? "S0"}${loc.exact ? "" : "  (resuming an interrupted migration)"}`);

	const plan = buildPlan({ migrations, loc, phase });
	result.notes.push(...plan.notes);
	// machine-readable plan: CI greps this (dry-run) for "removeField" / "deleteCollection" / "destructive": true
	// to decide whether to take a D1 Time Travel bookmark before the post phase.
	result.destructive = plan.steps.some((s) => s.destructive === true);
	result.plan = plan.steps.map((s, i) => {
		const rec = { step: i + 1, kind: s.kind, migration: s.migration, text: describeStep(s) };
		if (s.kind === "ops") Object.assign(rec, { label: s.label, destructive: s.destructive === true, ops: s.ops });
		if (s.kind === "backfill") Object.assign(rec, { backfill: s.backfill.id, collection: s.backfill.collection, from: s.backfill.from, to: s.backfill.to, catchUp: s.catchUp });
		if (s.kind === "gate") rec.checks = s.checks.map((c) => c.field);
		return rec;
	});
	if (!plan.steps.length) {
		say(phase === "pre" && loc.k < migrations.length ? "nothing to do in the pre phase" : "up to date: nothing to apply");
		for (const n of plan.notes) say(`note: ${n}`);
		return finish(EXIT.OK);
	}
	say("plan:");
	plan.steps.forEach((s, i) => say(`  ${i + 1}. ${describeStep(s)}`));
	for (const n of plan.notes) say(`note: ${n}`);
	if (dryRun) {
		say("dry run: nothing was changed");
		return finish(EXIT.OK);
	}

	const byId = new Map(migrations.map((m) => [m.id, m]));
	let defaultLocale;
	const t0 = performance.now();
	for (const [i, step] of plan.steps.entries()) {
		const m = byId.get(step.migration);
		const label = `[${i + 1}/${plan.steps.length}]`;
		const started = performance.now();
		const rec = { step: i + 1, kind: step.kind, migration: step.migration };
		result.steps.push(rec);

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
						say(`BLOCKED: ${describeOp(op)} refused by the server: ${e.message}\n  The collection still has content; migrate or delete the entries first (apply never uses force).`);
						rec.blocked = "COLLECTION_HAS_CONTENT";
						return finish(EXIT.BLOCKED);
					}
					say(`FAILED ${label} ${step.label} op ${step.from + j + 1}/${m.ops.length} ${describeOp(op)}: ${e.status ?? ""} ${e.code ?? ""} ${e.message}\n  live is now: ${rec.liveAfterFailure} (re-run schema:apply to resume)`);
					return finish(e instanceof LoopError ? e.exit : EXIT.REMOTE);
				}
				if (opts.verbose) say(`    ok ${describeOp(op)}`);
			}
			const expected = positionAt(positions, step.k, step.to);
			const after = await server.readLiveSchema();
			rec.liveHash = after.hash;
			rec.expectedHash = expected.hash;
			if (after.hash !== expected.hash) {
				const diff = diffPaths(expected.canonical, after.canonical);
				rec.diff = diff;
				say(`MISMATCH ${label} after ${step.label}: live ${short(after.hash)} != expected ${short(expected.hash)} (${expected.label}). The model and the server disagree, or the schema changed concurrently:\n${fmtDiff(diff, "expected", "live")}`);
				return finish(EXIT.DRIFT);
			}
			say(`${label} ${step.label} ok: ${step.ops.length} op${step.ops.length === 1 ? "" : "s"}, live == ${expected.label} (${Math.round(performance.now() - started)} ms)`);
		} else if (step.kind === "backfill") {
			defaultLocale ??= await defaultLocaleOf(server);
			const b = step.backfill;
			const res = await runBackfill(server, m, b, { defaultLocale, log: opts.verbose ? (l) => say(`    ${l}`) : undefined });
			Object.assign(rec, res);
			const tally = Object.entries(res.byAction).map(([k, v]) => `${k}=${v}`).join(" ") || "no entries";
			if (res.errors.length) {
				for (const e of res.errors) say(`  ${b.collection}/${e.slug ?? e.id}: ${e.message}`);
				say(`FAILED ${label} backfill ${b.id}: ${res.errors.length} of ${res.entries} entries could not be processed (${tally}). Fix and re-run schema:apply (backfills are idempotent).`);
				return finish(EXIT.REMOTE);
			}
			say(`${label} backfill ${b.id}${step.catchUp ? " (catch-up)" : ""}: ${res.entries} entries, ${tally} (${Math.round(performance.now() - started)} ms)`);
		} else if (step.kind === "gate") {
			defaultLocale ??= await defaultLocaleOf(server);
			const blockers = [];
			for (const c of step.checks) for (const x of await findBlockers(server, c.backfill, { defaultLocale })) blockers.push({ field: c.field, ...x });
			rec.blockers = blockers;
			if (blockers.length) {
				say(`BLOCKED ${label}: removing ${step.checks.map((c) => c.field).join(", ")} would lose data; ${blockers.length} entr${blockers.length === 1 ? "y has" : "ies have"} a version without the backfilled value:`);
				for (const x of blockers) say(`  ${x.field.split(".")[0]}/${x.slug ?? x.id} (${x.id}, ${x.status}): ${x.reason}`);
				say("Nothing was removed. Fix the entries (publish/discard the draft or re-run the backfill) and re-run --phase post.");
				return finish(EXIT.BLOCKED);
			}
			say(`${label} gate ok: every entry carries the backfilled value (${Math.round(performance.now() - started)} ms)`);
		}
		rec.ms = Math.round(performance.now() - started);
	}
	result.ms = Math.round(performance.now() - t0);
	const end = await server.readLiveSchema();
	const where = locate(positions, end.hash);
	result.finalLive = { hash: end.hash, position: where?.position.label ?? null };
	say(`done in ${result.ms} ms: live == ${where?.position.label ?? `${short(end.hash)} (not in chain!)`}`);
	return finish(EXIT.OK);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run(() => main());
