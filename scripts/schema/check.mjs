#!/usr/bin/env node
/**
 * schema:check — offline, no server. Verifies seed.json collections/fields == replay of schema/migrations.
 * Exit 0 ok · 1 check failed · 2 usage.
 */
import {
	EXIT, buildChain, checkImmutability, diffPaths, lintRefs, loadMigrations, loadSeedSchema, validateSeedData,
} from "./lib/index.mjs";
import { repoRoot } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "--json");
if (unknown.length) {
	console.error(`schema:check: unknown argument ${unknown[0]}\nusage: node scripts/schema/check.mjs [--json]`);
	process.exit(EXIT.USAGE);
}
const asJson = args.includes("--json");
const t0 = performance.now();
const root = repoRoot();
const errors = [];
const notes = [];
let seed;
let chain;
let count = 0;

try {
	seed = loadSeedSchema(root);
} catch (e) {
	errors.push({ code: "SEED_INVALID", message: `seed/seed.json: ${e.message}` });
}
if (seed) {
	errors.push(...seed.errors);
	errors.push(...(await validateSeedData(seed.seed)));
}

const loaded = loadMigrations(root);
errors.push(...loaded.errors);
count = loaded.migrations.length;
const structural = loaded.errors.some((e) => ["MIGRATION_INVALID", "MIGRATION_UNKNOWN_OP", "MIGRATION_FILENAME", "MIGRATION_SEQUENCE", "MIGRATION_OP_ORDER"].includes(e.code));
if (!structural) {
	chain = buildChain(loaded.migrations);
	errors.push(...chain.errors);
}

let drift;
if (seed && chain && !chain.errors.length) {
	if (chain.final.hash !== seed.hash) {
		drift = diffPaths(chain.final.canonical, seed.canonical).slice(0, 20);
		errors.push({ code: "SEED_DRIFT", message: `seed/seed.json differs from the migrations (replay ${chain.final.hash.slice(0, 12)} != seed ${seed.hash.slice(0, 12)}). run: npm run schema:generate` });
	}
}

const imm = checkImmutability(root);
errors.push(...imm.errors);
if (imm.skipped) notes.push(`immutability check skipped: ${imm.skipped}`);

if (chain) errors.push(...lintRefs(chain.history, root));

const ms = Math.round(performance.now() - t0);
const ok = errors.length === 0;
if (asJson) {
	console.log(JSON.stringify({ ok, migrations: count, hash: seed?.hash, replayHash: chain?.final.hash, errors, drift, notes, ms }, null, 2));
} else if (ok) {
	console.log(`schema:check ok: ${count} migration${count === 1 ? "" : "s"}, schema ${seed.hash.slice(0, 12)} (${ms} ms)`);
	for (const n of notes) console.log(`  note: ${n}`);
} else {
	console.error(`schema:check FAILED (${errors.length} problem${errors.length === 1 ? "" : "s"})`);
	for (const e of errors) console.error(`  ${e.code}: ${e.message}`);
	if (drift) for (const d of drift) console.error(`    ${d.path}: replay=${JSON.stringify(d.a)} seed=${JSON.stringify(d.b)}`);
	for (const n of notes) console.error(`  note: ${n}`);
}
process.exit(ok ? EXIT.OK : EXIT.CHECK_FAILED);
