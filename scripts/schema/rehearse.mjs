#!/usr/bin/env node
/**
 * schema:rehearse [--keep] [--json] [--update-types]
 *
 * Dress rehearsal of the deploy on a throwaway local server:
 *   1. temp dir with a SQLite DB + uploads (EMDASH_DATABASE_URL / EMDASH_UPLOADS_DIR, read by astro.config.mjs)
 *   2. seed it WITH content from the merge-base seed (`git merge-base HEAD origin/main`, fallback HEAD) with `emdash seed`
 *   3. boot `astro dev` on a free port (--ignore-lock: never touches a running dev server of this checkout)
 *   4. schema:apply --phase all  (dev-bypass setup is done by the script), schema:verify
 *   5. parity: live canonical == pure-model replay == canonical(seed)   (this replaces importing emdash internals)
 *   6. the working tree must be unchanged: emdash-env.d.ts is backed up/restored (the dev server rewrites it) and any
 *      change to tracked files is a failure. `--update-types` keeps the regenerated emdash-env.d.ts instead
 *      (then commit it together with the migration).
 * Always stops the server and deletes the temp dir (also on SIGINT/SIGTERM). Target < 30 s.
 * Exit: 0 ok · 1 verify/parity/working-tree check failed · 4/5/6 propagated from schema:apply · 6 server/seed failure.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT, diffPaths } from "./lib/index.mjs";
import { loadChainOrFail } from "./lib/context.mjs";
import { repoRoot } from "./lib/paths.mjs";
import { LoopError, parseArgs, run } from "./lib/cli.mjs";
import { connect } from "./lib/server.mjs";

const USAGE = "node scripts/schema/rehearse.mjs [--keep] [--json] [--update-types]";
const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const git = (root, args) => {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	return { ok: r.status === 0, out: r.stdout ?? "" };
};

function freePort() {
	return new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.once("error", reject);
		srv.listen(0, "127.0.0.1", () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

function runChild(cmd, args, opts) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		child.on("close", (code) => resolve({ code, stdout, stderr }));
		child.on("error", (e) => resolve({ code: 127, stdout, stderr: String(e) }));
	});
}

export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { keep: "boolean", json: "boolean", "update-types": "boolean" }, USAGE);
	const json = Boolean(opts.json);
	const log = (...a) => (json ? console.error(...a) : console.log(...a));
	const root = repoRoot();
	const timings = {};
	const t0 = performance.now();
	const lap = (name, from) => (timings[name] = Math.round(performance.now() - from));
	const report = { ok: false, steps: [], timings, notes: [] };
	let server;
	let tmp;
	const logChunks = [];
	let envBackup;
	let desiredEnv; // what emdash-env.d.ts must contain once the server is gone
	const envFile = path.join(root, "emdash-env.d.ts");
	let cleaned = false;
	const cleanup = async () => {
		if (cleaned) return;
		cleaned = true;
		if (server && server.exitCode === null) {
			try {
				process.kill(-server.pid, "SIGTERM");
			} catch {
				/* already gone */
			}
			for (let i = 0; i < 20 && server.exitCode === null; i++) await sleep(100);
			if (server.exitCode === null) {
				try {
					process.kill(-server.pid, "SIGKILL");
				} catch {
					/* gone */
				}
			}
		}
		if (desiredEnv !== undefined && existsSync(envFile) && readFileSync(envFile, "utf8") !== desiredEnv) writeFileSync(envFile, desiredEnv);
		if (tmp && opts.keep) {
			try {
				writeFileSync(path.join(tmp, "dev.log"), logChunks.join(""));
				console.error(`rehearse: kept ${tmp}`);
			} catch {
				/* best effort */
			}
		}
		if (tmp && !opts.keep) rmSync(tmp, { recursive: true, force: true });
	};
	const onSignal = (sig) => {
		cleanup().finally(() => process.exit(128 + (sig === "SIGINT" ? 2 : 15)));
	};
	process.once("SIGINT", () => onSignal("SIGINT"));
	process.once("SIGTERM", () => onSignal("SIGTERM"));

	const fail = (exit, msg) => {
		report.error = msg;
		throw new LoopError(exit, "REHEARSE_FAILED", msg);
	};

	try {
		const { seed, chain, migrations } = loadChainOrFail(root);
		const statusBefore = git(root, ["status", "--porcelain", "--untracked-files=no"]).out;
		envBackup = existsSync(envFile) ? readFileSync(envFile, "utf8") : undefined;
		desiredEnv = envBackup;

		// 1. merge-base seed
		const mb = git(root, ["merge-base", "HEAD", "origin/main"]);
		const base = mb.ok && mb.out.trim() ? mb.out.trim() : "HEAD";
		let baseSeedText = git(root, ["show", `${base}:seed/seed.json`]);
		if (!baseSeedText.ok) {
			report.notes.push(`no seed/seed.json at ${base}: seeding from the working tree seed`);
			baseSeedText = { ok: true, out: readFileSync(seed.path, "utf8") };
		}
		log(`rehearse: seeding from ${base === "HEAD" ? "HEAD" : base.slice(0, 10)} (${migrations.length} migration${migrations.length === 1 ? "" : "s"}, target ${chain.final.hash.slice(0, 12)})`);
		tmp = mkdtempSync(path.join(process.env.SCHEMA_REHEARSE_TMP || os.tmpdir(), "schema-rehearse-"));
		mkdirSync(path.join(tmp, "seed"));
		writeFileSync(path.join(tmp, "seed", "seed.json"), baseSeedText.out);
		const media = path.join(root, "seed", "media");
		if (existsSync(media)) symlinkSync(media, path.join(tmp, "seed", "media"));
		const dbPath = path.join(tmp, "data.db");
		const uploads = path.join(tmp, "uploads");

		// 2. seed with content
		let t = performance.now();
		const emdashBin = path.join(root, "node_modules", ".bin", "emdash");
		const seeded = await runChild(emdashBin, ["seed", path.join(tmp, "seed", "seed.json"), "--database", dbPath, "--uploads-dir", uploads, "--content"], { cwd: root, env: process.env });
		lap("seedMs", t);
		if (seeded.code !== 0) {
			console.error(seeded.stdout.split("\n").slice(-25).join("\n"), seeded.stderr);
			fail(EXIT.REMOTE, `emdash seed failed (exit ${seeded.code})`);
		}
		report.steps.push("seeded");

		// 3. boot the server
		t = performance.now();
		const port = await freePort();
		const url = `http://127.0.0.1:${port}`;
		const logFile = path.join(tmp, "dev.log");
		const astroBin = path.join(root, "node_modules", "astro", "bin", "astro.mjs");
		server = spawn(process.execPath, [astroBin, "dev", "--ignore-lock", "--port", String(port), "--host", "127.0.0.1"], {
			cwd: root,
			detached: true,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, EMDASH_DATABASE_URL: `file:${dbPath}`, EMDASH_UPLOADS_DIR: uploads, NO_COLOR: "1", FORCE_COLOR: "0" },
		});
		server.stdout.on("data", (d) => logChunks.push(String(d)));
		server.stderr.on("data", (d) => logChunks.push(String(d)));
		const dumpLog = () => {
			writeFileSync(logFile, logChunks.join(""));
			console.error(logChunks.join("").split("\n").slice(-40).join("\n"));
		};
		let ready = false;
		for (let i = 0; i < 600 && !ready; i++) {
			if (server.exitCode !== null) {
				dumpLog();
				fail(EXIT.REMOTE, `astro dev exited early (code ${server.exitCode})`);
			}
			try {
				await (await fetch(`${url}/_emdash/api/auth/dev-bypass`, { redirect: "manual" })).text();
				ready = true;
			} catch {
				await sleep(100);
			}
		}
		if (!ready) {
			dumpLog();
			fail(EXIT.REMOTE, "astro dev did not become ready in 60 s");
		}
		lap("bootMs", t);
		report.steps.push(`server ${url}`);
		log(`rehearse: server up on ${url} (${timings.bootMs} ms)`);

		// 4. apply + verify (the real CLIs)
		const generatedCount = () => (logChunks.join("").match(/Generated emdash-env\.d\.ts/g) ?? []).length;
		const generatedBefore = generatedCount();
		const env = { ...process.env, EMDASH_TOKEN: "" };
		delete env.EMDASH_TOKEN; // rehearsal always uses dev bypass on its own localhost server
		t = performance.now();
		const applied = await runChild(process.execPath, [path.join(here, "apply.mjs"), "--url", url, "--phase", "all", "--json"], { cwd: root, env });
		lap("applyMs", t);
		let applyJson;
		try {
			applyJson = JSON.parse(applied.stdout);
		} catch {
			/* not json */
		}
		if (applied.code !== 0) {
			console.error(applied.stderr.trim());
			if (applyJson) console.error(JSON.stringify(applyJson, null, 2));
			else console.error(applied.stdout);
			report.apply = applyJson;
			throw new LoopError(applied.code || EXIT.REMOTE, "APPLY_FAILED", `schema:apply exited ${applied.code}`);
		}
		const nSteps = applyJson?.steps?.length ?? 0;
		log(`rehearse: schema:apply ok (${nSteps} step${nSteps === 1 ? "" : "s"}, ${timings.applyMs} ms; live was ${applyJson?.live?.position})`);
		report.apply = { steps: nSteps, from: applyJson?.live?.position, plan: applyJson?.plan };
		t = performance.now();
		const verified = await runChild(process.execPath, [path.join(here, "verify.mjs"), "--url", url, "--json"], { cwd: root, env });
		lap("verifyMs", t);
		if (verified.code !== 0) {
			console.error(verified.stdout || verified.stderr);
			fail(EXIT.CHECK_FAILED, "schema:verify failed after apply");
		}
		log(`rehearse: schema:verify ok (${timings.verifyMs} ms)`);

		// 5. parity: live == pure model == seed
		const live = await (await connect({ url })).readLiveSchema();
		if (live.hash !== chain.final.hash || live.hash !== seed.hash) {
			const diff = diffPaths(chain.final.canonical, live.canonical).slice(0, 30);
			for (const d of diff) console.error(`  ${d.path}: model=${JSON.stringify(d.a)} live=${JSON.stringify(d.b)}`);
			fail(EXIT.CHECK_FAILED, `parity failed: live ${live.hash.slice(0, 12)} model ${chain.final.hash.slice(0, 12)} seed ${seed.hash.slice(0, 12)}: the pure model in scripts/schema/lib/model.mjs disagrees with the server`);
		}
		log(`rehearse: parity ok (live == model == seed == ${live.hash.slice(0, 12)})`);

		// 6. working tree untouched (the dev server rewrites emdash-env.d.ts from the DB schema after every schema change)
		const changedSchema = (applyJson?.steps ?? []).some((x) => x.kind === "ops");
		t = performance.now();
		if (changedSchema) {
			for (let i = 0; i < 200 && generatedCount() === generatedBefore; i++) await sleep(100);
			if (generatedCount() === generatedBefore) report.notes.push("dev server did not report regenerating emdash-env.d.ts after the schema change");
			for (let last = -1; last !== generatedCount(); ) {
				last = generatedCount();
				await sleep(1000);
			}
		}
		lap("typegenWaitMs", t);
		const envNow = existsSync(envFile) ? readFileSync(envFile, "utf8") : undefined;
		const problems = [];
		let typesUpdated = false;
		if (envNow !== envBackup) {
			const a = path.join(tmp, "env.expected.d.ts");
			const b = path.join(tmp, "env.generated.d.ts");
			writeFileSync(a, envBackup ?? "");
			writeFileSync(b, envNow ?? "");
			const d = spawnSync("diff", ["-u", a, b], { encoding: "utf8" }).stdout;
			if (opts["update-types"]) {
				writeFileSync(envFile, envNow ?? "");
				typesUpdated = true;
				desiredEnv = envNow;
				log(`rehearse: emdash-env.d.ts regenerated for the final schema (--update-types); commit it:\n${d.split("\n").slice(0, 30).join("\n")}`);
			} else {
				writeFileSync(envFile, envBackup ?? "");
				problems.push(`emdash-env.d.ts is stale: after applying the migrations the dev server generates different types than the committed file.\nRegenerate and commit it: npm run schema:rehearse -- --update-types\n${d.split("\n").slice(0, 40).join("\n")}`);
			}
		}
		const statusAfter = git(root, ["status", "--porcelain", "--untracked-files=no"]).out;
		if (statusAfter !== statusBefore && !typesUpdated) problems.push(`tracked files changed during the rehearsal:\n${statusAfter}\n(before:\n${statusBefore})`);
		if (problems.length) {
			for (const p of problems) console.error(p);
			fail(EXIT.CHECK_FAILED, "rehearsal left the working tree modified");
		}
		log(typesUpdated ? "rehearse: emdash-env.d.ts updated" : "rehearse: working tree unchanged (emdash-env.d.ts identical)");

		report.ok = true;
		timings.totalMs = Math.round(performance.now() - t0);
		log(`rehearse: OK in ${(timings.totalMs / 1000).toFixed(1)} s (seed ${timings.seedMs} ms, boot ${timings.bootMs} ms, apply ${timings.applyMs} ms, verify ${timings.verifyMs} ms)`);
		return EXIT.OK;
	} catch (e) {
		timings.totalMs = Math.round(performance.now() - t0);
		if (e instanceof LoopError) report.exit = e.exit;
		throw e;
	} finally {
		await cleanup();
		if (json) console.log(JSON.stringify(report, null, 2));
	}
}

await run(() => main());
