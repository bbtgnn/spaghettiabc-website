/**
 * Schema-loop core library — offline barrel (no EmDash HTTP, no `emdash/internal/*`).
 *
 * Seams
 *   offline (this barrel): seed → migrations → positions/chain → check/generate/differ/model
 *     Safe for predev and unit tests. No live server.
 *   online (import from the file, not this barrel):
 *     ./state.mjs     loadSchemaState / loadSchemaStateOrFail  (also re-exported here; pure disk)
 *     ./execute.mjs   executePlan                               (also re-exported here; needs a server adapter)
 *     ./project.mjs   REST body builders                        (also re-exported here; no HTTP)
 *     ./cli.mjs       LoopError, parseArgs, run                 — pulls `emdash/client` for error mapping
 *     ./server.mjs    connect, normalizeUrl, ensureDevSetup     — EmDash HTTP transport
 *     ./rehearse.mjs  rehearse(root, opts), assertModelLiveParity — boots Astro; do not import from here
 *     ./plan.mjs      buildPlan                                 — pure; used by apply CLI
 *     ./live-ops.mjs  applyOpLive                               — REST apply of one op
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
 * Schema state (seed + migrations + positions)
 *   loadSchemaState(root?, { strictSeed? }) -> { seed, migrations, positions, built, chain, seedInSync, errors }
 *   loadSchemaStateOrFail(root?, { strictSeed? })                 throws LoopError on errors / seed drift
 *
 * Apply execution
 *   executePlan({ server, plan, positions, migrations, opts? }) -> { exit, steps, ms?, finalLive? }
 *
 * Model (single module: scripts/schema/lib/model.mjs; defaults table, refusal rules, op semantics)
 *   applyOps(canonical, ops, { history?, offset? }) -> canonical  throws ModelError { code, opIndex, op }
 *   phaseOf(op) -> "pre" | "post" ; splitOps(ops) -> { pre, post, ordered } ; isDestructive(op)
 *   normalizeCollection / normalizeField / minimizeCollection / minimizeField ; COLLECTION_DEFAULTS, FIELD_DEFAULTS
 *   CLEARABLE_COLLECTION_KEYS / CLEARABLE_FIELD_KEYS              value the REST update must send to clear a key
 *
 * REST projection (project.mjs; CLEARABLE_* stay in model)
 *   collectionCreateBodies / collectionUpdateBody / fieldCreateBody / fieldUpdateBody
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
 *
 * Not exported here (online / EmDash-coupled — import from the file):
 *   cli.mjs, server.mjs, rehearse.mjs, plan.mjs, live-ops.mjs, backfill.mjs
 */
export const EXIT = { OK: 0, CHECK_FAILED: 1, USAGE: 2, STOP: 3, DRIFT: 4, BLOCKED: 5, REMOTE: 6 };

export { stableStringify, hashSchema, sha256, deepEqual } from "./hash.mjs";
export { canonicalFromSeed, canonicalFromLive, diffPaths } from "./canonical.mjs";
export { loadSeedSchema, lintSeedCollections, validateSeedData } from "./seed.mjs";
export { loadMigrations, validateMigrationDoc, backfillModuleName, TODO_STUB } from "./migrations.mjs";
export {
	buildPositions, locate, nearest, positionAt, buildChain, locateInChain, chainFromBuilt,
} from "./position.mjs";
export { loadSchemaState, loadSchemaStateOrFail } from "./state.mjs";
export { executePlan } from "./execute.mjs";
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
export {
	collectionCreateBodies, collectionUpdateBody, fieldCreateBody, fieldUpdateBody,
} from "./project.mjs";
