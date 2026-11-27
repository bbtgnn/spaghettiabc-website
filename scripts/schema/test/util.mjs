import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const SCRIPTS = path.join(REAL_ROOT, "scripts/schema");
/** frozen with the fixture seed (the real baseline follows the real seed) */
export const BASELINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/0001_baseline.json");
export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
/** frozen copy of the seed schema at baseline time (the real seed evolves) */
export const fixtureSeed = () => readJson(path.join(FIXTURES, "seed.json"));
export const liveFixture = () => readJson(path.join(FIXTURES, "live-schema.json"));

/** temp repo root with the frozen seed + the baseline migration (and an optional src/); `cleanup()` removes it */
export function tempRepo({ withSrc = false } = {}) {
	const root = mkdtempSync(path.join(os.tmpdir(), "schema-loop-"));
	mkdirSync(path.join(root, "seed"));
	cpSync(path.join(FIXTURES, "seed.json"), path.join(root, "seed/seed.json"));
	mkdirSync(path.join(root, "schema/migrations"), { recursive: true });
	cpSync(BASELINE, path.join(root, "schema/migrations/0001_baseline.json"));
	if (withSrc) mkdirSync(path.join(root, "src/pages"), { recursive: true });
	return {
		root,
		seed: () => readJson(path.join(root, "seed/seed.json")),
		writeSeed: (seed) => writeFileSync(path.join(root, "seed/seed.json"), `${JSON.stringify(seed, null, "\t")}\n`),
		write: (rel, text) => {
			mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
			writeFileSync(path.join(root, rel), text);
		},
		read: (rel) => readFileSync(path.join(root, rel), "utf8"),
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

/** run a schema CLI against `root`; stdout/stderr captured */
export function run(script, args, root) {
	const r = spawnSync(process.execPath, [path.join(SCRIPTS, `${script}.mjs`), ...args], {
		encoding: "utf8",
		env: { ...process.env, SCHEMA_REPO_ROOT: root },
	});
	return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: r.stdout + r.stderr };
}

export function git(root, ...args) {
	const r = spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
	if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
	return r.stdout.trim();
}

/** find a collection/field in a seed object */
export const collection = (seed, slug) => seed.collections.find((c) => c.slug === slug);
export const field = (seed, coll, slug) => collection(seed, coll).fields.find((f) => f.slug === slug);
