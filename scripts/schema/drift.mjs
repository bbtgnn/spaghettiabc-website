#!/usr/bin/env node
/**
 * schema:drift --url <url> [--json]
 * Where is the live schema relative to seed.json and to the migration chain?
 * Exit 0 live schema is a known chain state (possibly behind: pending migrations are listed) · 4 DRIFT (not in the
 * chain) · 1 seed/migrations invalid · 2 usage · 6 API error.
 */
import { EXIT, canonicalFromSeed, diffPaths, hashSchema } from "./lib/index.mjs";
import { loadChainOrFail } from "./lib/context.mjs";
import { locate, nearest } from "./lib/position.mjs";
import { LoopError, parseArgs, run } from "./lib/cli.mjs";
import { connect } from "./lib/server.mjs";

const USAGE = "node scripts/schema/drift.mjs --url <url> [--json]";

export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { url: "string", json: "boolean" }, USAGE);
	if (!opts.url) throw new LoopError(EXIT.USAGE, "USAGE", `--url is required\nusage: ${USAGE}`);
	const { seed, migrations, chain, positions, seedInSync } = loadChainOrFail(undefined, { strictSeed: false });
	const server = await connect({ url: opts.url });
	const live = await server.readLiveSchema();
	const seedCanonical = canonicalFromSeed(seed.collections);
	const loc = locate(positions, live.hash);
	const vsSeed = live.hash === hashSchema(seedCanonical) ? [] : diffPaths(seedCanonical, live.canonical);
	const out = {
		url: server.baseUrl,
		liveHash: live.hash,
		seedHash: seed.hash,
		chainHash: chain.final.hash,
		seedMatchesMigrations: seedInSync,
		inSyncWithSeed: vsSeed.length === 0,
		inChain: Boolean(loc),
		position: loc?.position.label ?? null,
		interrupted: loc ? !loc.exact : null,
		pendingMigrations: loc ? migrations.slice(loc.k).map((m) => m.id) : null,
		nearest: null,
		diffVsSeed: vsSeed,
		diffVsNearest: [],
	};
	if (!loc) {
		const near = nearest(positions, live.canonical);
		out.nearest = near.position.label;
		out.diffVsNearest = near.diff;
	}
	const exit = loc ? EXIT.OK : EXIT.DRIFT;
	if (opts.json) {
		console.log(JSON.stringify({ ok: exit === EXIT.OK, exit, ...out }, null, 2));
		return exit;
	}
	const h = (x) => x.slice(0, 12);
	console.log(`schema:drift ${server.baseUrl}`);
	console.log(`  live ${h(live.hash)}  seed ${h(seed.hash)}  migrations ${h(chain.final.hash)}${seedInSync ? "" : "  (seed != migrations: run npm run schema:generate)"}`);
	if (loc) {
		console.log(`  live == ${loc.position.label}${loc.exact ? "" : "  (an interrupted apply; npm run schema:apply resumes it)"}`);
		console.log(out.pendingMigrations.length ? `  pending: ${out.pendingMigrations.join(", ")}` : "  no pending migrations");
		if (vsSeed.length) console.log(`  vs seed: ${vsSeed.length} difference${vsSeed.length === 1 ? "" : "s"}${out.pendingMigrations.length ? " (expected until the pending migrations are applied)" : ""}`);
		else console.log("  live matches seed");
	} else {
		console.log(`  DRIFT: live is not a state of the migration chain. Nearest: ${out.nearest}`);
		for (const d of out.diffVsNearest.slice(0, 30)) console.log(`    ${d.path}: chain=${JSON.stringify(d.a)} live=${JSON.stringify(d.b)}`);
		if (out.diffVsNearest.length > 30) console.log(`    … ${out.diffVsNearest.length - 30} more`);
		console.log("  Resolve: reconcile by hand (revert the live change) or add it to seed.json + a migration; never edit applied migrations.");
	}
	return exit;
}

await run(() => main());
