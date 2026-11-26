#!/usr/bin/env node
/**
 * Wipe local Wrangler / Miniflare state so the next `npm run dev` migrates and
 * auto-seeds from seed/seed.json (empty DB + setup not completed).
 *
 * Local only — never touches remote D1/R2. Works on macOS, Linux, and Windows.
 */
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_PORT = 4321;

const TARGETS = [
	".wrangler/state/v3/d1",
	".wrangler/state/v3/r2",
	"data.db",
	"data.db-shm",
	"data.db-wal",
];

function isPortInUse(port) {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once("error", (err) => {
			resolve(err && err.code === "EADDRINUSE");
		});
		server.once("listening", () => {
			server.close(() => resolve(false));
		});
		server.listen(port, "127.0.0.1");
	});
}

if (await isPortInUse(DEV_PORT)) {
	console.error(
		`Port ${DEV_PORT} is in use. Stop \`npm run dev\` first, then re-run.`,
	);
	process.exit(1);
}

let removed = 0;
for (const relative of TARGETS) {
	const target = path.join(root, relative);
	if (!existsSync(target)) continue;
	await rm(target, { recursive: true, force: true });
	console.log(`Removed ${relative}`);
	removed += 1;
}

if (removed === 0) {
	console.log("Nothing to wipe (already clean).");
} else {
	console.log("Local D1/R2 (and legacy data.db, if present) wiped.");
}

console.log(`
Next:
  npm run dev
  open http://localhost:${DEV_PORT}/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin

Note: EmDash migrations still create built-in category/tag; delete those in admin/API if you want them gone.
`);
