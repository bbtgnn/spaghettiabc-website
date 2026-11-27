#!/usr/bin/env node
/**
 * Wipe + seed before `astro dev`. Invoked via the npm `predev` lifecycle.
 * Cross-platform (macOS, Linux, Windows) — uses Node + `shell: true` for npm.cmd.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Refuse to wipe a `data.db` whose collections/fields were edited locally (admin UI) and never saved to the seed.
 * Schema hash of data.db (public `emdash export-seed`, no content) vs seed.json. A hash that is a known
 * migration-chain state is safe: it is a committed schema (e.g. seed edited, or branch pulled), not a local edit.
 * Skips when data.db is absent, FORCE_WIPE=1, or the DB cannot be read (the wipe repairs it).
 */
async function guardUnsavedSchema() {
	if (process.env.FORCE_WIPE === "1") {
		console.warn("predev: FORCE_WIPE=1 — skipping the unsaved-schema guard.");
		return;
	}
	if (!existsSync(path.join(root, "data.db"))) return;

	const exported = spawnSync("npx --no-install emdash export-seed --database data.db --no-pretty", {
		cwd: root,
		shell: true,
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
		env: { ...process.env, NODE_NO_WARNINGS: "1" },
	});
	let dbSeed;
	try {
		dbSeed = JSON.parse(exported.stdout.slice(exported.stdout.indexOf("{")));
	} catch {
		console.warn("predev: could not read data.db schema (export-seed failed); skipping the guard.");
		return;
	}

	const lib = await import(pathToFileURL(path.join(root, "scripts/schema/lib/index.mjs")).href);
	const dbHash = lib.hashSchema(lib.canonicalFromSeed(dbSeed));
	const seedHash = lib.loadSeedSchema(root).hash;
	if (dbHash === seedHash) return;

	try {
		const chain = lib.buildChain(lib.loadMigrations(root).migrations);
		if (!chain.errors.length && lib.locateInChain(chain, dbHash)) return;
	} catch {
		// Unreadable migrations: fall through to refusing (hash differs from seed).
	}

	console.error(`
predev: REFUSING to wipe data.db — its collections/fields differ from seed/seed.json
and match no committed migration state (db ${dbHash.slice(0, 12)}, seed ${seedHash.slice(0, 12)}).
Local schema edits would be lost. Either:
  1. keep them:    npx astro dev            # starts the server on the existing data.db, no wipe
                   npm run schema:pull      # (second terminal) writes the live schema into seed/seed.json
                   npm run schema:generate  # writes the migration; then stop dev
  2. discard them: FORCE_WIPE=1 npm run dev
`);
	process.exit(1);
}

await guardUnsavedSchema();

function runNpmScript(script) {
	// Single-string + shell so Windows resolves npm.cmd without DEP0190.
	const result = spawnSync(`npm run ${script}`, {
		cwd: root,
		stdio: "inherit",
		shell: true,
		env: process.env,
	});
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

runNpmScript("sync:locale-pages");
runNpmScript("wipe:local");
runNpmScript("seed");
