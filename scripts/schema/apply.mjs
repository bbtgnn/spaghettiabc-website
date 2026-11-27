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
import { EXIT, loadSchemaStateOrFail } from "./lib/index.mjs";
import { executePlan } from "./lib/execute.mjs";
import { buildPlan, describeStep } from "./lib/plan.mjs";
import { locate, nearest } from "./lib/position.mjs";
import { LoopError, parseArgs, run } from "./lib/cli.mjs";
import { connect } from "./lib/server.mjs";

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

	const { migrations, chain, positions } = loadSchemaStateOrFail();
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

	const outcome = await executePlan({
		server,
		plan,
		positions,
		migrations,
		opts: { verbose: Boolean(opts.verbose), log: say },
	});
	result.steps = outcome.steps;
	if (outcome.ms != null) result.ms = outcome.ms;
	if (outcome.finalLive) result.finalLive = outcome.finalLive;
	return finish(outcome.exit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run(() => main());
