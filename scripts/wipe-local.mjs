#!/usr/bin/env node
/**
 * Wipe local Node/SQLite state (`data.db` + WAL) and `uploads/`.
 * Also clears legacy Wrangler Miniflare D1/R2 under `.wrangler` if present.
 * Standalone wipe. `npm run dev` already runs wipe + seed via `predev`.
 *
 * Local only — never touches remote D1/R2. Works on macOS, Linux, and Windows.
 */
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { devPort } from "./lib/dev-port.mjs";
import { classifyListener, listenerCwds } from "./lib/port-owner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same port as `astro dev` (worktree PORT from `.env.local`, else 4321).
const DEV_PORT = devPort(root);

const TARGETS = [
	"data.db",
	"data.db-shm",
	"data.db-wal",
	"uploads",
	".wrangler/state/v3/d1",
	".wrangler/state/v3/r2",
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
	const listener = listenerCwds(DEV_PORT);
	const { cwds, unknown } = listener;
	const ours = classifyListener(listener, root) !== "foreign";
	if (ours) {
		console.error(
			`Port ${DEV_PORT} is in use${unknown ? " (cannot tell which checkout owns it)" : " by this checkout's dev server"}. Stop \`npm run dev\` first, then re-run.`,
		);
		process.exit(1);
	}
	console.log(`Port ${DEV_PORT} is held by another checkout (${cwds.join(", ")}); continuing.`);
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
	console.log("Local SQLite + uploads (and legacy Wrangler state, if present) wiped.");
}

console.log(`
Next (if not already via predev):
  npm run seed
  npm run dev
  open http://localhost:${DEV_PORT}/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin

Note: EmDash migrations still create built-in category/tag; delete those in admin/API if you want them gone.
`);
