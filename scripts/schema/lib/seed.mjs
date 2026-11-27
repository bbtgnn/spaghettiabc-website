import { readFileSync } from "node:fs";
import { canonicalFromSeed } from "./canonical.mjs";
import { hashSchema } from "./hash.mjs";
import { SEED_COLLECTION_KEYS, SEED_FIELD_KEYS } from "./model.mjs";
import { repoRoot, seedPath } from "./paths.mjs";

/** Structural lint beyond `validateSeed`: keys the model does not know would silently not be hashed. */
export function lintSeedCollections(collections) {
	const errors = [];
	const err = (message) => errors.push({ code: "SEED_INVALID", message });
	const slugs = new Set();
	for (const c of collections) {
		if (slugs.has(c.slug)) err(`duplicate collection slug "${c.slug}"`);
		slugs.add(c.slug);
		for (const k of Object.keys(c))
			if (k !== "fields" && !SEED_COLLECTION_KEYS.includes(k)) err(`collection "${c.slug}": key "${k}" is not part of the schema loop`);
		const fields = new Set();
		for (const f of c.fields ?? []) {
			if (fields.has(f.slug)) err(`collection "${c.slug}": duplicate field slug "${f.slug}"`);
			fields.add(f.slug);
			for (const k of Object.keys(f))
				if (!SEED_FIELD_KEYS.includes(k)) err(`field "${c.slug}.${f.slug}": key "${k}" is not part of the schema loop`);
		}
	}
	return errors;
}

/**
 * Read collections/fields from `seed/seed.json` (everything else is out of scope for the loop).
 * -> { path, seed, collections, canonical, hash, errors }
 */
export function loadSeedSchema(root = repoRoot()) {
	const file = seedPath(root);
	const seed = JSON.parse(readFileSync(file, "utf8"));
	const collections = seed.collections ?? [];
	const canonical = canonicalFromSeed(collections);
	return { path: file, seed, collections, canonical, hash: hashSchema(canonical), errors: lintSeedCollections(collections) };
}

/** EmDash's own seed validation (public `emdash/seed`). Loaded lazily: it costs ~150 ms to import. -> [{code, message}] */
export async function validateSeedData(seed) {
	const { validateSeed } = await import("emdash/seed");
	const result = validateSeed(seed);
	return (result.errors ?? []).map((e) => ({ code: "SEED_INVALID", message: `validateSeed: ${typeof e === "string" ? e : (e.message ? `${e.path ?? ""} ${e.message}`.trim() : JSON.stringify(e))}` }));
}
