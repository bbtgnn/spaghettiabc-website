/**
 * Load seed + migrations + positions in one place (offline). Callers that only need a report use
 * `loadSchemaState`; remote CLIs that must fail fast use `loadSchemaStateOrFail`.
 */
import { EXIT } from "./index.mjs";
import { loadMigrations } from "./migrations.mjs";
import { repoRoot } from "./paths.mjs";
import { buildPositions, chainFromBuilt } from "./position.mjs";
import { loadSeedSchema } from "./seed.mjs";
import { LoopError } from "./cli.mjs";

/**
 * -> { seed, migrations, positions, built, chain, seedInSync, errors }
 * Does not throw for validation problems; aggregates them in `errors`.
 * `strictSeed` is reserved for `loadSchemaStateOrFail` (ignored here except as a documented option).
 */
export function loadSchemaState(root = repoRoot(), { strictSeed: _strictSeed = true } = {}) {
	const errors = [];
	let seed = null;
	try {
		seed = loadSeedSchema(root);
		errors.push(...seed.errors.map((e) => ({ code: e.code, message: e.message })));
	} catch (e) {
		errors.push({ code: "SEED_INVALID", message: `seed/seed.json: ${e.message}` });
	}

	const loaded = loadMigrations(root);
	errors.push(...loaded.errors.map((e) => ({ code: e.code, message: e.message })));
	const hardLoadErrors = errors.length > 0;

	const built = buildPositions(loaded.migrations);
	errors.push(...built.errors.map((e) => ({ code: e.code, message: e.message })));

	const chain = chainFromBuilt(built, loaded.migrations);
	const seedInSync = !hardLoadErrors && seed != null && built.final != null && built.final.hash === seed.hash;

	return {
		seed,
		migrations: loaded.migrations,
		positions: built.positions,
		built,
		chain,
		seedInSync,
		errors,
	};
}

/** like loadSchemaState, but throws LoopError (CHECK_FAILED / SEED_DRIFT) when invalid or seed out of sync */
export function loadSchemaStateOrFail(root = repoRoot(), { strictSeed = true } = {}) {
	const state = loadSchemaState(root, { strictSeed });
	if (state.errors.length) {
		throw new LoopError(
			EXIT.CHECK_FAILED,
			"CHECK_FAILED",
			`seed/migrations are invalid (run npm run schema:check):\n${state.errors.map((p) => `  ${p.code}: ${p.message}`).join("\n")}`,
		);
	}
	if (strictSeed && !state.seedInSync) {
		throw new LoopError(EXIT.CHECK_FAILED, "SEED_DRIFT", "seed/seed.json differs from the migrations (run npm run schema:generate)");
	}
	return state;
}
