#!/usr/bin/env node
/**
 * schema:pull [--url http://127.0.0.1:4321] [--dry-run] [--json]
 *
 * Default URL = http://127.0.0.1:<this worktree's PORT from .env.local, else 4321> (same resolution as astro.config.mjs). For localhost URLs the listener on that port must belong to this
 * checkout (lsof cwd inside the repo root; a default port can be shared across worktrees), otherwise exit 2. If ownership cannot be determined
 * (Windows / no lsof) an explicit --url is required. Non-local URLs (staging) are not checked.
 *
 * Writes the LIVE collections/fields back into seed/seed.json. Only `collections` is touched; every other key and all
 * content stay byte-for-byte as they were (same indentation, trailing newline). Collections and fields that already
 * match the live schema (canonically) are left exactly as written in the seed, so a pull against an unchanged server
 * produces a byte-identical file. Changed ones are edited key by key (existing key order kept); new ones are appended.
 * After a pull run `npm run schema:generate` to turn the seed change into a migration.
 * Exit 0 ok · 2 usage · 6 API error.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	EXIT, SEED_COLLECTION_KEYS, SEED_FIELD_KEYS, canonicalFromLive, deepEqual, minimizeCollection, minimizeField,
	normalizeCollection, normalizeField, repoRoot, seedPath,
} from "./lib/index.mjs";
import { devPort } from "../lib/dev-port.mjs";
import { listenerCwds, ownershipVerdict } from "../lib/port-owner.mjs";
import { LoopError, connect, isLocalUrl, normalizeUrl, parseArgs, run } from "./lib/server.mjs";

const USAGE = "node scripts/schema/pull.mjs [--url http://127.0.0.1:$PORT|4321] [--dry-run] [--json]";
const defaultUrl = () => `http://127.0.0.1:${devPort(repoRoot())}`;

/** canonical keys that cannot be written to a seed (derived / not seedable): reported instead of written */
const UNSEEDABLE = ["hasSeo", "commentsModeration", "commentsClosedAfterDays", "commentsAutoApproveUsers"];

/** make `target` (a seed object) canonically equal to `wantedCanon`, touching only keys that differ */
function syncKeys(target, curCanon, wantedCanon, wantedMin, keys, changes, where) {
	for (const k of keys) {
		if (deepEqual(curCanon[k], wantedCanon[k])) continue;
		const defaultValued = wantedMin[k] === undefined;
		if (defaultValued) delete target[k];
		else target[k] = wantedMin[k];
		changes.push(`${where}.${k}: ${JSON.stringify(curCanon[k])} -> ${JSON.stringify(wantedCanon[k])}`);
	}
}

export function mergeLive(seedCollections, liveCanonical) {
	const changes = [];
	const unseedable = [];
	const live = new Map(liveCanonical.collections.map((c) => [c.slug, c]));
	const out = [];
	for (const sc of seedCollections) {
		const lc = live.get(sc.slug);
		if (!lc) {
			changes.push(`collection ${sc.slug}: removed`);
			continue;
		}
		const cur = normalizeCollection(sc);
		const want = { ...lc };
		const wantMin = minimizeCollection(lc);
		const col = { ...sc };
		if (deepEqual({ ...cur, fields: undefined }, { ...want, fields: undefined })) {
			/* collection-level keys equal: keep as written */
		} else {
			for (const k of UNSEEDABLE) if (!deepEqual(cur[k], want[k]) && !(k === "hasSeo")) unseedable.push(`${sc.slug}.${k}: seed ${JSON.stringify(cur[k])} live ${JSON.stringify(want[k])}`);
			syncKeys(col, cur, want, wantMin, SEED_COLLECTION_KEYS.filter((k) => k !== "slug"), changes, sc.slug);
			// `supports` is always explicit in the minimal form; only write it when it really changed
		}
		const seedFields = new Map((sc.fields ?? []).map((f) => [f.slug, f]));
		const fields = [];
		for (const lf of lc.fields) {
			const sf = seedFields.get(lf.slug);
			if (!sf) {
				fields.push(minimizeField(lf));
				changes.push(`field ${sc.slug}.${lf.slug}: added (${lf.type})`);
				continue;
			}
			const curF = normalizeField(sf);
			if (deepEqual(curF, lf)) {
				fields.push(sf);
				continue;
			}
			const f = { ...sf };
			syncKeys(f, curF, lf, minimizeField(lf), SEED_FIELD_KEYS.filter((k) => k !== "slug"), changes, `${sc.slug}.${lf.slug}`);
			fields.push(f);
		}
		for (const sf of sc.fields ?? []) if (!lc.fields.some((f) => f.slug === sf.slug)) changes.push(`field ${sc.slug}.${sf.slug}: removed`);
		const oldOrder = (sc.fields ?? []).map((f) => f.slug).filter((s) => lc.fields.some((f) => f.slug === s));
		const newOrder = fields.map((f) => f.slug).filter((s) => oldOrder.includes(s));
		if (oldOrder.join() !== newOrder.join()) changes.push(`fields ${sc.slug}: reordered`);
		col.fields = fields;
		out.push(col);
	}
	for (const lc of liveCanonical.collections) {
		if (seedCollections.some((c) => c.slug === lc.slug)) continue;
		const min = minimizeCollection(lc);
		out.push({ ...min, fields: lc.fields.map(minimizeField) });
		changes.push(`collection ${lc.slug}: added`);
	}
	return { collections: out, changes, unseedable };
}

/** indentation string of a JSON text (first indented line); tab when undetectable */
const detectIndent = (text) => /^\{\r?\n([ \t]+)"/.exec(text)?.[1] ?? "\t";

/**
 * Local URLs only: the server on that port must be THIS checkout's (a port can be shared across worktrees); otherwise we could
 * copy another worktree's schema into this seed. Non-local URLs (staging) are not checked.
 * `ownership(port)` -> { cwds, unknown } resolves the listener. It is a plain function parameter of `runPull`
 * (in-process API only; no env var or flag reaches it); the CLI always passes the real lsof resolver.
 */
function assertOwnLocalServer(url, explicitUrl, root, ownership) {
	const u = new URL(normalizeUrl(url));
	if (!isLocalUrl(u.origin)) return;
	const port = Number(u.port) || (u.protocol === "https:" ? 443 : 80);
	const verdict = ownershipVerdict(ownership(port), root, { port, explicitUrl });
	if (verdict.action === "refuse") throw new LoopError(EXIT.USAGE, "FOREIGN_SERVER", verdict.message);
	if (verdict.action === "warn") console.error(verdict.message);
}

/**
 * Pull the live schema of `url` into `<root>/seed/seed.json`. Programmatic entry point (the CLI wraps it).
 * `ownership` is injectable here only so in-process tests can stub the listener lookup; the CLI never overrides it.
 * -> { baseUrl, file, changed, written, changes, unseedable, formatPreserved }
 */
export async function runPull({ url, root = repoRoot(), ownership = listenerCwds, explicitUrl = true, dryRun = false, token } = {}) {
	assertOwnLocalServer(url, explicitUrl, root, ownership);
	const server = await connect(token === undefined ? { url } : { url, token });
	const file = seedPath(root);
	const text = readFileSync(file, "utf8");
	const seed = JSON.parse(text);
	const indent = detectIndent(text);
	const eol = text.endsWith("\n") ? "\n" : "";
	const live = await server.readLive();
	const merged = mergeLive(seed.collections ?? [], canonicalFromLive(live));
	seed.collections = merged.collections;
	const next = JSON.stringify(seed, null, indent) + eol;
	const formatPreserved = JSON.stringify(JSON.parse(text), null, indent) + eol === text;
	const changed = next !== text;
	if (changed && !dryRun) writeFileSync(file, next);
	return { baseUrl: server.baseUrl, file, changed, written: changed && !dryRun, changes: merged.changes, unseedable: merged.unseedable, formatPreserved };
}

/** CLI: always the real lsof-based ownership resolver */
export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { url: "string", "dry-run": "boolean", json: "boolean" }, USAGE);
	const r = await runPull({ url: opts.url ?? defaultUrl(), explicitUrl: opts.url !== undefined, dryRun: !!opts["dry-run"], ownership: listenerCwds });
	if (opts.json) {
		console.log(JSON.stringify({ ok: true, url: r.baseUrl, file: r.file, changed: r.changed, written: r.written, changes: r.changes, unseedable: r.unseedable, formatPreserved: r.formatPreserved }, null, 2));
		return EXIT.OK;
	}
	console.log(`schema:pull ${r.baseUrl} -> seed/seed.json: ${r.changed ? (opts["dry-run"] ? "would change" : "updated") : "unchanged"}`);
	for (const c of r.changes) console.log(`  ${c}`);
	for (const u of r.unseedable) console.log(`  warning: not representable in seed.json, skipped: ${u}`);
	if (!r.formatPreserved) console.log("  warning: seed.json was not in canonical JSON formatting; other sections were reformatted too");
	if (r.changed) console.log("next: npm run schema:generate (turns the seed change into a migration), then npm run schema:check");
	return EXIT.OK;
}

const isEntry = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isEntry) await run(() => main());
