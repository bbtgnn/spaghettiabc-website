/**
 * Schema-loop core library (offline, no EmDash server, no `emdash/internal/*`).
 *
 * Shapes
 *   seed collections  raw `seed.json` collections/fields.
 *   canonical         { v, collections: [{slug,label,supports,hasSeo,...,fields:[{slug,label,type,required,...}]}] }
 *                     defaults filled, volatile keys stripped, collections sorted by (sortOrder, slug).
 *   migration         { id, seq, name, file, description, destructive, ops, backfills, preOps, postOps }
 *   position          { k, n, hash, canonical, kind: base|pre|full|partial, label }
 *                     built by one replay (`buildPositions`); coarse chain is a view (base|pre|full only).
 *   chain             { states, history, final, errors }; state = { index, migration, phase: base|pre|full, hash, canonical }
 *                     compatibility view of positions (see buildChain / chainFromBuilt).
 *   stop              { code, details, hint }   (generator STOP, exit 3)
 *
 * Seed / live
 *   loadSeedSchema(root?) -> { path, seed, collections, canonical, hash, errors }
 *   validateSeedData(seed) -> Promise<[{code,message}]>          EmDash `validateSeed`, lazy import
 *   canonicalFromSeed(seedOrCollections) -> canonical
 *   canonicalFromLive(collections) -> canonical                   array of `EmDashClient.collection(slug)` results
 *   hashSchema(canonical) -> sha256 hex ; stableStringify(v) ; diffPaths(a, b) -> [{path, a, b}]
 *
 * Migrations / positions
 *   loadMigrations(root?) -> { dir, migrations, errors }          static validation incl. backfill module checks
 *   buildPositions(migrations) -> { positions, history, final, errors }
 *   locate(positions, hash) / nearest(positions, canonical) / positionAt(positions, k, n)
 *   buildChain(migrations) / locateInChain(chain, hash)           coarse view (base|pre|full)
 *
 * Model (single module: scripts/schema/lib/model.mjs; defaults table, refusal rules, op semantics)
 *   applyOps(canonical, ops, { history?, offset? }) -> canonical  throws ModelError { code, opIndex, op }
 *   phaseOf(op) -> "pre" | "post" ; splitOps(ops) -> { pre, post, ordered } ; isDestructive(op)
 *   normalizeCollection / normalizeField / minimizeCollection / minimizeField ; COLLECTION_DEFAULTS, FIELD_DEFAULTS
 *   CLEARABLE_COLLECTION_KEYS / CLEARABLE_FIELD_KEYS              value the REST update must send to clear a key
 *
 * Differ
 *   diffSchemas(oldCanonical, newCanonical, { renames, dropAdd, allowDestructive, history })
 *       -> { ops, pre, post, backfills, stops, notes }
 *
 * Repo checks
 *   checkImmutability(root?) -> { errors, base, skipped }         git merge-base based
 *   lintRefs(history, root?) -> [{ code, file, line, message }]   src/** references to removed fields/collections
 *   repoRoot() (env SCHEMA_REPO_ROOT overrides)
 *
 * Exit codes shared by every schema script: 0 ok, 1 check failed, 2 usage, 3 generator STOP, 4 live DRIFT,
 * 5 blocked, 6 remote/API error. Exported as EXIT.
 */
export const EXIT = { OK: 0, CHECK_FAILED: 1, USAGE: 2, STOP: 3, DRIFT: 4, BLOCKED: 5, REMOTE: 6 };

export { stableStringify, hashSchema, sha256, deepEqual } from "./hash.mjs";
export { canonicalFromSeed, canonicalFromLive, diffPaths } from "./canonical.mjs";
export { loadSeedSchema, lintSeedCollections, validateSeedData } from "./seed.mjs";
export { loadMigrations, validateMigrationDoc, backfillModuleName, TODO_STUB } from "./migrations.mjs";
export {
	buildPositions, locate, nearest, positionAt, buildChain, locateInChain, chainFromBuilt,
} from "./position.mjs";
export { diffSchemas, UsageError } from "./differ.mjs";
export { checkImmutability } from "./git.mjs";
export { lintRefs } from "./refs.mjs";
export { repoRoot, seedPath, migrationsDir } from "./paths.mjs";
export {
	applyOps, ModelError, MODEL_ONLY_CODES, phaseOf, splitOps, isDestructive, describeOp, newHistory, cloneHistory,
	normalizeCollection, normalizeField, minimizeCollection, minimizeField, emptyCanonical, sortCollections,
	COLLECTION_DEFAULTS, FIELD_DEFAULTS, FIELD_TYPE_TO_COLUMN, TEXT_ALIAS_TYPES, CANONICAL_VERSION,
	CLEARABLE_COLLECTION_KEYS, CLEARABLE_FIELD_KEYS, SEED_COLLECTION_KEYS, SEED_FIELD_KEYS, OP_NAMES,
} from "./model.mjs";
