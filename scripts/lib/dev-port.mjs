/**
 * This checkout's dev-server port, resolved exactly like `astro.config.mjs`: the worktree `PORT` from `.env.local`
 * (never `.env`, which holds secrets), an already-set `process.env.PORT` wins, else 4321.
 */
import path from "node:path";

export function devPort(root) {
	try {
		process.loadEnvFile(path.join(root, ".env.local"));
	} catch {}
	return Number(process.env.PORT) || 4321;
}
