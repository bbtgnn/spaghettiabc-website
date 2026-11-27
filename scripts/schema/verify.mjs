#!/usr/bin/env node
/**
 * schema:verify --url <url> [--json]
 * Live schema hash must equal canonical(seed.json) hash. Exit 0 ok · 1 differs (path-level diff) · 2 usage · 6 API error.
 */
import { EXIT, canonicalFromSeed, diffPaths, hashSchema, loadSeedSchema } from "./lib/index.mjs";
import { LoopError, parseArgs, run } from "./lib/cli.mjs";
import { connect } from "./lib/server.mjs";

const USAGE = "node scripts/schema/verify.mjs --url <url> [--json]";

export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { url: "string", json: "boolean" }, USAGE);
	if (!opts.url) throw new LoopError(EXIT.USAGE, "USAGE", `--url is required\nusage: ${USAGE}`);
	const seed = loadSeedSchema();
	const server = await connect({ url: opts.url });
	const live = await server.readLiveSchema();
	const expected = canonicalFromSeed(seed.collections);
	const same = live.hash === hashSchema(expected);
	const diff = same ? [] : diffPaths(expected, live.canonical);
	if (opts.json) {
		console.log(JSON.stringify({ ok: same, url: server.baseUrl, liveHash: live.hash, seedHash: seed.hash, diff }, null, 2));
	} else if (same) {
		console.log(`schema:verify ok: ${server.baseUrl} matches seed/seed.json (${live.hash.slice(0, 12)})`);
	} else {
		console.error(`schema:verify FAILED: live ${live.hash.slice(0, 12)} != seed ${seed.hash.slice(0, 12)} (${server.baseUrl})`);
		for (const d of diff.slice(0, 40)) console.error(`  ${d.path}: seed=${JSON.stringify(d.a)} live=${JSON.stringify(d.b)}`);
		if (diff.length > 40) console.error(`  … ${diff.length - 40} more`);
		console.error("run: npm run schema:drift -- --url <url>   (is the live schema behind the migrations? then: npm run schema:apply)");
	}
	return same ? EXIT.OK : EXIT.CHECK_FAILED;
}

await run(() => main());
