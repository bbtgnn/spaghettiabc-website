#!/usr/bin/env node
/**
 * Wipe + seed before `astro dev`. Invoked via the npm `predev` lifecycle.
 * Cross-platform (macOS, Linux, Windows) — uses Node + `shell: true` for npm.cmd.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

runNpmScript("wipe:local");
runNpmScript("seed");
