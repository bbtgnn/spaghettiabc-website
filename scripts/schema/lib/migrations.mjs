import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { OP_NAMES, isDestructive, splitOps } from "./model.mjs";
import { migrationsDir, repoRoot } from "./paths.mjs";

const JSON_FILE = /^(\d{4})_([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const BACKFILL_FILE = /^(\d{4}_[a-z0-9]+(?:-[a-z0-9]+)*)\.backfill\.mjs$/;
const MIGRATION_KEYS = ["id", "description", "destructive", "ops", "backfills"];
const BACKFILL_KEYS = ["id", "collection", "to", "from", "transform", "locales"];
/** a generated stub that was never filled in */
export const TODO_STUB = /throw\s+new\s+Error\(\s*["'`]TODO/;

export const backfillModuleName = (id) => `${id}.backfill.mjs`;

/** Static (state-independent) validation of one parsed migration document. -> [{code, message}] */
export function validateMigrationDoc(doc, id, { hasModule, moduleSource } = {}) {
	const errors = [];
	const err = (code, message) => errors.push({ code, migration: id, message: `${id}: ${message}` });
	if (!doc || typeof doc !== "object" || Array.isArray(doc)) return [{ code: "MIGRATION_INVALID", migration: id, message: `${id}: not a JSON object` }];
	for (const k of Object.keys(doc)) if (!MIGRATION_KEYS.includes(k)) err("MIGRATION_INVALID", `unknown key "${k}"`);
	if (doc.id !== id) err("MIGRATION_INVALID", `"id" must equal the file name ("${id}"), got ${JSON.stringify(doc.id)}`);
	if (typeof doc.description !== "string" || !doc.description) err("MIGRATION_INVALID", `"description" must be a non-empty string`);
	if (typeof doc.destructive !== "boolean") err("MIGRATION_INVALID", `"destructive" must be a boolean`);
	if (!Array.isArray(doc.ops) || doc.ops.length === 0) {
		err("MIGRATION_INVALID", `"ops" must be a non-empty array`);
		return errors;
	}
	for (const [i, op] of doc.ops.entries())
		if (!op || !OP_NAMES.includes(op.op)) err("MIGRATION_UNKNOWN_OP", `ops[${i}] has unknown op ${JSON.stringify(op?.op)}`);
	if (errors.some((e) => e.code === "MIGRATION_UNKNOWN_OP")) return errors;

	if (!splitOps(doc.ops).ordered) err("MIGRATION_OP_ORDER", `pre-phase ops must come before post-phase ops (removeField/deleteCollection last)`);
	const destructive = doc.ops.some(isDestructive);
	if (typeof doc.destructive === "boolean" && doc.destructive !== destructive)
		err("MIGRATION_DESTRUCTIVE_FLAG", `"destructive" is ${doc.destructive} but the ops are ${destructive ? "destructive (removeField/deleteCollection)" : "not destructive"}`);

	const backfills = doc.backfills ?? [];
	if (!Array.isArray(backfills)) err("MIGRATION_INVALID", `"backfills" must be an array`);
	const ids = new Set();
	let needsModule = false;
	for (const [i, b] of (Array.isArray(backfills) ? backfills : []).entries()) {
		const at = `backfills[${i}]`;
		for (const k of Object.keys(b ?? {})) if (!BACKFILL_KEYS.includes(k)) err("BACKFILL_INVALID", `${at}: unknown key "${k}"`);
		for (const k of ["id", "collection", "to", "from"])
			if (typeof b?.[k] !== "string" || !b[k]) err("BACKFILL_INVALID", `${at}: "${k}" must be a non-empty string`);
		if (!["copy", "module"].includes(b?.transform)) err("BACKFILL_INVALID", `${at}: transform must be "copy" or "module"`);
		if (!["default", "all"].includes(b?.locales)) err("BACKFILL_INVALID", `${at}: locales must be "default" or "all"`);
		if (ids.has(b?.id)) err("BACKFILL_INVALID", `${at}: duplicate backfill id "${b.id}"`);
		ids.add(b?.id);
		if (b?.transform === "module") needsModule = true;
	}
	if ((Array.isArray(backfills) ? backfills : []).filter((b) => b?.transform === "module").length > 1)
		err("BACKFILL_INVALID", `at most one transform "module" backfill per migration (the module exports a single transform)`);
	if (needsModule && !hasModule) err("BACKFILL_MODULE_MISSING", `transform "module" needs ${backfillModuleName(id)}`);
	if (!needsModule && hasModule) err("BACKFILL_MODULE_ORPHAN", `${backfillModuleName(id)} exists but no backfill uses transform "module"`);
	if (needsModule && hasModule) {
		if (TODO_STUB.test(moduleSource ?? "")) err("BACKFILL_TODO", `${backfillModuleName(id)} is still a stub (throws TODO); implement transform(value, entry)`);
		if (!/export\s+(async\s+)?function\s+transform\b|export\s+(const|let)\s+transform\b|export\s*\{[^}]*\btransform\b/.test(moduleSource ?? ""))
			err("BACKFILL_MODULE_INVALID", `${backfillModuleName(id)} must export transform(value, entry)`);
	}
	return errors;
}

/**
 * Read + statically validate `schema/migrations/*.json`, sorted by number.
 * -> { dir, migrations: [{id, seq, name, file, description, destructive, ops, backfills, preOps, postOps}], errors }
 * `migrations` only holds documents that parsed; check `errors` before trusting it.
 */
export function loadMigrations(root = repoRoot()) {
	const dir = migrationsDir(root);
	const errors = [];
	const migrations = [];
	if (!existsSync(dir)) return { dir, migrations, errors };
	const files = readdirSync(dir).sort();
	const modules = new Map(files.map((f) => BACKFILL_FILE.exec(f)).filter(Boolean).map((m) => [m[1], m[0]]));
	const seen = new Set();
	for (const f of files) {
		if (!f.endsWith(".json")) continue;
		const m = JSON_FILE.exec(f);
		if (!m) {
			errors.push({ code: "MIGRATION_FILENAME", message: `${f}: expected NNNN_kebab-name.json` });
			continue;
		}
		const id = f.slice(0, -".json".length);
		seen.add(id);
		let doc;
		try {
			doc = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
		} catch (e) {
			errors.push({ code: "MIGRATION_INVALID", migration: id, message: `${f}: ${e.message}` });
			continue;
		}
		const moduleFile = modules.get(id);
		const moduleSource = moduleFile ? readFileSync(path.join(dir, moduleFile), "utf8") : undefined;
		const docErrors = validateMigrationDoc(doc, id, { hasModule: Boolean(moduleFile), moduleSource });
		errors.push(...docErrors);
		if (docErrors.some((e) => ["MIGRATION_INVALID", "MIGRATION_UNKNOWN_OP"].includes(e.code))) continue;
		const { pre, post } = splitOps(doc.ops);
		migrations.push({
			id, seq: Number(m[1]), name: m[2], file: path.join(dir, f), description: doc.description,
			destructive: doc.destructive, ops: doc.ops, backfills: doc.backfills ?? [], preOps: pre, postOps: post,
		});
	}
	for (const id of modules.keys()) if (!seen.has(id)) errors.push({ code: "BACKFILL_MODULE_ORPHAN", migration: id, message: `${backfillModuleName(id)} has no matching ${id}.json` });
	migrations.sort((a, b) => a.seq - b.seq || (a.id < b.id ? -1 : 1));
	migrations.forEach((m, i) => {
		if (m.seq !== i + 1) errors.push({ code: "MIGRATION_SEQUENCE", migration: m.id, message: `${m.id}: expected number ${String(i + 1).padStart(4, "0")} (numbers must be unique and contiguous from 0001)` });
	});
	return { dir, migrations, errors };
}
