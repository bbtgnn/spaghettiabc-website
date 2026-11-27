import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./paths.mjs";

const DIR = "schema/migrations";

function git(root, args) {
	const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	return { ok: r.status === 0, out: (r.stdout ?? "").trim() };
}

/**
 * Migrations are immutable once they exist in `git merge-base HEAD origin/main` (fallback HEAD): every file
 * under schema/migrations/ present there must be byte-identical in the index and the working tree, and not
 * deleted or renamed. -> { errors, base, skipped }  (`skipped` = reason when git is unavailable / no commits)
 */
export function checkImmutability(root = repoRoot()) {
	const skip = (reason) => ({ errors: [], base: null, skipped: reason });
	if (!existsSync(path.join(root, ".git"))) {
		const top = git(root, ["rev-parse", "--show-toplevel"]);
		if (!top.ok || realpathSync(top.out) !== realpathSync(root)) return skip("not a git repository");
	}
	if (!git(root, ["rev-parse", "--verify", "-q", "HEAD"]).ok) return skip("no commits yet");
	const mb = git(root, ["merge-base", "HEAD", "origin/main"]);
	const base = mb.ok && mb.out ? mb.out : "HEAD";

	const baseFiles = new Map();
	for (const line of git(root, ["ls-tree", "-r", base, "--", DIR]).out.split("\n").filter(Boolean)) {
		const [meta, file] = line.split("\t");
		baseFiles.set(file, meta.split(" ")[2]);
	}
	if (!baseFiles.size) return { errors: [], base, skipped: null };

	const indexFiles = new Map();
	for (const line of git(root, ["ls-files", "-s", "--", DIR]).out.split("\n").filter(Boolean)) {
		const [meta, file] = line.split("\t");
		indexFiles.set(file, meta.split(" ")[1]);
	}
	const present = [...baseFiles.keys()].filter((f) => existsSync(path.join(root, f)));
	const worktree = new Map();
	if (present.length) {
		const hashes = git(root, ["hash-object", "--", ...present]).out.split("\n");
		present.forEach((f, i) => worktree.set(f, hashes[i]));
	}

	const errors = [];
	const err = (code, file, message) => errors.push({ code, file, message: `${file}: ${message}` });
	for (const [file, oid] of baseFiles) {
		if (!indexFiles.has(file)) err("MIGRATION_DELETED", file, "existing migration deleted or renamed (migrations are immutable; add a new migration instead)");
		else if (indexFiles.get(file) !== oid) err("MIGRATION_MODIFIED", file, "existing migration modified in the index (migrations are immutable; add a new migration instead)");
		else if (!worktree.has(file)) err("MIGRATION_DELETED", file, "existing migration missing from the working tree");
		else if (worktree.get(file) !== oid) err("MIGRATION_MODIFIED", file, "existing migration modified in the working tree (migrations are immutable; add a new migration instead)");
	}
	return { errors, base, skipped: null };
}
