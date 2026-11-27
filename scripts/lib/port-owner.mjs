/**
 * Which checkout owns the dev server listening on a local port?
 * Git worktrees of this repo can end up on the same port (default 4321), so scripts that act on "the server on port N"
 * (wipe-local, schema:pull) must check the listener's working directory first.
 *
 * Technique: `lsof` lists listener PIDs, then `lsof -a -p <pid> -d cwd -Fn` gives each PID's cwd.
 * Windows (or no lsof): unknown.
 */
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

/** Who listens on `port`? -> { cwds, unknown }. `unknown` = listener's checkout cannot be determined. */
export function listenerCwds(port) {
	if (process.platform === "win32") return { cwds: [], unknown: true };
	const pids = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
	if (pids.error || !pids.stdout.trim()) return { cwds: [], unknown: true };
	const cwds = [];
	for (const pid of pids.stdout.trim().split("\n")) {
		const r = spawnSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" });
		const line = r.stdout?.split("\n").find((l) => l.startsWith("n"));
		if (!line) return { cwds: [], unknown: true };
		cwds.push(line.slice(1));
	}
	return { cwds, unknown: false };
}

export function isInside(dir, parent) {
	const rel = path.relative(realpathSync(parent), realpathSync(dir));
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Pure ownership decision (no lsof): `listener` = { cwds, unknown } as returned by `listenerCwds`.
 * -> "unknown" (cannot tell) | "ours" (some listener cwd is inside `root`) | "foreign" (listener(s) elsewhere).
 */
export function classifyListener({ cwds, unknown }, root) {
	if (unknown) return "unknown";
	return cwds.some((cwd) => existsSync(cwd) && isInside(cwd, root)) ? "ours" : "foreign";
}

/**
 * Pure policy for scripts that must act on THIS checkout's server (schema:pull).
 * -> { action: "allow" | "warn" | "refuse", status, cwds, message? }
 *   ours -> allow · foreign -> refuse · unknown -> warn when `--url` was explicit, refuse when relying on the default.
 */
export function ownershipVerdict(listener, root, { port, explicitUrl }) {
	const status = classifyListener(listener, root);
	const cwds = listener.cwds;
	if (status === "ours") return { action: "allow", status, cwds };
	if (status === "foreign") {
		return {
			action: "refuse",
			status,
			cwds,
			message: `port ${port} is served by another checkout (${cwds.join(", ")}), not this one (${root}). Refusing to touch it. Start this checkout's dev server and pass --url with its port (e.g. --url http://127.0.0.1:<port>).`,
		};
	}
	if (explicitUrl) {
		return {
			action: "warn",
			status,
			cwds,
			message: `WARNING: cannot determine which checkout owns port ${port} (Windows, no lsof, or no listener found). Trusting the explicit --url; make sure it is THIS checkout's dev server (${root}).`,
		};
	}
	return {
		action: "refuse",
		status,
		cwds,
		message: `cannot determine which checkout owns port ${port} (Windows, no lsof, or no listener found), so the default URL is not safe to use. Pass --url with this checkout's dev server (${root}) explicitly, e.g. --url http://127.0.0.1:<port>.`,
	};
}
