#!/usr/bin/env node
/**
 * schema:generate [name] [--rename coll.old=new ...] [--resolve drop-add:coll.old,coll.new ...]
 *                 [--allow-destructive] [--description "..."]
 * Diffs replay(schema/migrations) against seed.json and writes the next NNNN_<name>.json.
 * Exit 0 ok / nothing to generate · 1 seed or migrations invalid · 2 usage · 3 STOP (JSON on stdout).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	EXIT, UsageError, backfillModuleName, buildChain, describeOp, diffSchemas, loadSchemaState,
	migrationsDir, repoRoot, validateMigrationDoc, validateSeedData,
} from "./lib/index.mjs";

const usage = `usage: node scripts/schema/generate.mjs [name] [--rename coll.old=new ...] [--resolve drop-add:coll.old,coll.new ...] [--allow-destructive] [--description "..."]`;
const die = (message, code = EXIT.USAGE) => {
	console.error(`schema:generate: ${message}`);
	process.exit(code);
};

function parseArgs(argv) {
	const out = { name: undefined, renames: [], dropAdd: [], allowDestructive: false, description: undefined };
	for (let i = 0; i < argv.length; i++) {
		let a = argv[i];
		let inline;
		const eq = a.startsWith("--") ? a.indexOf("=") : -1;
		if (eq !== -1 && ["--rename", "--resolve", "--description"].includes(a.slice(0, eq))) [a, inline] = [a.slice(0, eq), a.slice(eq + 1)];
		const value = () => inline ?? argv[++i] ?? die(`${a} needs a value\n${usage}`);
		if (a === "--allow-destructive") out.allowDestructive = true;
		else if (a === "--rename") {
			const m = /^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)=([a-z][a-z0-9_]*)$/.exec(value());
			if (!m) die(`--rename expects collection.old=new\n${usage}`);
			out.renames.push({ collection: m[1], from: m[2], to: m[3] });
		} else if (a === "--resolve") {
			const v = value();
			if (!v.startsWith("drop-add:")) die(`--resolve expects drop-add:<old>,<new>\n${usage}`);
			out.dropAdd.push(v.slice("drop-add:".length));
		} else if (a === "--description") out.description = value();
		else if (a.startsWith("-")) die(`unknown flag ${a}\n${usage}`);
		else if (out.name === undefined) out.name = a;
		else die(`unexpected argument ${a}\n${usage}`);
	}
	return out;
}

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function deriveName(ops, backfills) {
	if (backfills.length) {
		const b = backfills[0];
		return kebab(`rename-${b.collection}-${b.from}-to-${b.to}`);
	}
	const label = (op) => {
		const verb = { createCollection: "create", updateCollection: "update", deleteCollection: "delete", reorderCollections: "reorder", addField: "add", updateField: "update", removeField: "remove", reorderFields: "reorder" }[op.op];
		const target = op.op === "createCollection" ? op.collection.slug : op.op === "reorderCollections" ? "collections" : [op.collection, typeof op.field === "string" ? op.field : op.field?.slug].filter(Boolean).join("-");
		return `${verb}-${target}`;
	};
	const main = ops.filter((op) => !op.op.startsWith("reorder"));
	const labels = [...new Set((main.length ? main : ops).map(label))];
	return kebab(labels.slice(0, 2).join("-and-") + (labels.length > 2 ? "-etc" : "")).slice(0, 60).replace(/-$/, "");
}

function stubSource(id, b) {
	return `// Backfill for ${id}: ${b.collection}.${b.from} -> ${b.collection}.${b.to}
// Pure and deterministic: no I/O, no Date.now(), no Math.random().
/** @param value the entry's \`${b.from}\` value  @param entry the entry's data  @returns the new \`${b.to}\` value */
export function transform(value, entry) {
	throw new Error("TODO: implement transform for ${b.collection}.${b.from} -> ${b.collection}.${b.to}");
}
`;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.name !== undefined && kebab(opts.name) !== opts.name) die(`name "${opts.name}" must be kebab-case (a-z, 0-9, hyphens)`);

const root = repoRoot();
const state = loadSchemaState(root);
const seed = state.seed;
if (!seed) {
	const seedErr = state.errors.find((e) => e.code === "SEED_INVALID");
	die(seedErr?.message ?? "seed/seed.json is unreadable", EXIT.CHECK_FAILED);
}
const problems = [...state.errors, ...(await validateSeedData(seed.seed))];
if (problems.length) {
	console.error("schema:generate: cannot diff, fix these first (npm run schema:check):");
	for (const p of problems) console.error(`  ${p.code}: ${p.message}`);
	process.exit(EXIT.CHECK_FAILED);
}
const { chain, migrations } = state;

let result;
try {
	result = diffSchemas(chain.final.canonical, seed.canonical, { renames: opts.renames, dropAdd: opts.dropAdd, allowDestructive: opts.allowDestructive, history: chain.history });
} catch (e) {
	if (e instanceof UsageError) die(e.message);
	throw e;
}

if (result.stops.length) {
	const [first] = result.stops;
	console.log(JSON.stringify({ stop: first.code, details: first.details, hint: first.hint, all: result.stops }, null, 2));
	process.exit(EXIT.STOP);
}
if (!result.ops.length) {
	console.log("schema:generate: nothing to generate (seed.json matches the migrations)");
	process.exit(EXIT.OK);
}
if (result.backfills.filter((b) => b.transform === "module").length > 1) die("more than one type-changing rename in one migration: generate them one at a time");

const seq = migrations.length + 1;
const name = opts.name ?? (migrations.length ? deriveName(result.ops, result.backfills) : "baseline");
const id = `${String(seq).padStart(4, "0")}_${name}`;
const destructive = result.post.length > 0;
const description = opts.description ?? (migrations.length ? result.ops.map(describeOp).join("; ") : "Baseline: create the seed schema from empty");
const doc = { id, description, destructive, ops: result.ops, ...(result.backfills.length ? { backfills: result.backfills } : {}) };
const moduleBackfill = result.backfills.find((b) => b.transform === "module");

// the generated migration must replay to exactly the seed schema
const docErrors = validateMigrationDoc(doc, id, { hasModule: Boolean(moduleBackfill), moduleSource: "export function transform() {}" });
const parsed = { id, seq, name, description, destructive, ops: doc.ops, backfills: result.backfills, preOps: result.pre, postOps: result.post };
const verify = buildChain([...migrations, parsed]);
const bad = [...docErrors, ...verify.errors];
if (!bad.length && verify.final.hash !== seed.hash) bad.push({ code: "GENERATOR_MISMATCH", message: "generated ops do not replay to the seed schema" });
if (bad.length) {
	console.error("schema:generate: internal error, generated migration is invalid (nothing written):");
	for (const p of bad) console.error(`  ${p.code}: ${p.message}`);
	process.exit(EXIT.CHECK_FAILED);
}

mkdirSync(migrationsDir(root), { recursive: true });
const file = path.join(migrationsDir(root), `${id}.json`);
writeFileSync(file, `${JSON.stringify(doc, null, "\t")}\n`);
console.log(`schema:generate: wrote ${path.relative(root, file)} (${result.pre.length} pre op${result.pre.length === 1 ? "" : "s"}, ${result.post.length} post op${result.post.length === 1 ? "" : "s"}${destructive ? ", destructive" : ""})`);
if (moduleBackfill) {
	const stub = path.join(migrationsDir(root), backfillModuleName(id));
	writeFileSync(stub, stubSource(id, moduleBackfill));
	console.log(`schema:generate: wrote ${path.relative(root, stub)}: implement transform(value, entry); schema:check fails while it throws TODO`);
}
for (const b of result.backfills.filter((x) => x.transform === "copy")) console.log(`schema:generate: backfill ${b.collection}.${b.from} -> ${b.to} (copy, locales: ${b.locales})`);
