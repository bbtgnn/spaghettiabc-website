#!/usr/bin/env node
/**
 * Smoke-check the Cloudflare build under workerd: `astro build` then `astro preview`,
 * fetch `/`, stop. Any HTTP response means the Worker booted; seeded D1 is not required
 * (and not set up here — see ADR 0009).
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { devPort } from "./lib/dev-port.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PREVIEW_PORT) || devPort(root) + 1000;
const host = "127.0.0.1";
const readyMs = Number(process.env.CHECK_WORKERD_TIMEOUT_MS) || 120_000;

function run(cmd, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: root,
			stdio: "inherit",
			env: process.env,
			shell: process.platform === "win32",
		});
		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (signal) reject(new Error(`${cmd} ${args.join(" ")} killed by ${signal}`));
			else if (code) reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
			else resolve();
		});
	});
}

function isPortFree(p) {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once("error", () => resolve(false));
		server.once("listening", () => {
			server.close(() => resolve(true));
		});
		server.listen(p, host);
	});
}

async function waitForHttp(url, deadline) {
	let lastErr;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url, { redirect: "manual" });
			return res;
		} catch (err) {
			lastErr = err;
			await new Promise((r) => setTimeout(r, 400));
		}
	}
	throw lastErr ?? new Error(`timed out waiting for ${url}`);
}

if (!(await isPortFree(port))) {
	console.error(`Port ${port} is in use. Set PREVIEW_PORT to a free port and retry.`);
	process.exit(1);
}

console.log("Building for Cloudflare (workerd)…");
await run("npm", ["run", "build"]);

console.log(`Starting astro preview on http://${host}:${port}…`);
const preview = spawn(
	"npx",
	["astro", "preview", "--host", host, "--port", String(port)],
	{
		cwd: root,
		stdio: ["ignore", "pipe", "pipe"],
		env: process.env,
		shell: process.platform === "win32",
	},
);

let previewLog = "";
const append = (chunk) => {
	previewLog += chunk.toString();
};
preview.stdout.on("data", append);
preview.stderr.on("data", append);

const stop = () => {
	if (!preview.killed) preview.kill("SIGTERM");
};

process.on("exit", stop);
process.on("SIGINT", () => {
	stop();
	process.exit(130);
});

try {
	const res = await waitForHttp(`http://${host}:${port}/`, Date.now() + readyMs);
	console.log(`workerd preview responded HTTP ${res.status} for /`);
	console.log("check:workerd ok");
} catch (err) {
	console.error("check:workerd failed:", err.message);
	if (previewLog.trim()) {
		console.error("--- preview log ---");
		console.error(previewLog.trim());
	}
	process.exitCode = 1;
} finally {
	stop();
	await new Promise((resolve) => {
		if (preview.exitCode !== null) resolve();
		else preview.once("exit", resolve);
		setTimeout(() => {
			if (!preview.killed) preview.kill("SIGKILL");
			resolve();
		}, 5_000);
	});
}
