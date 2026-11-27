import { EXIT, loadMigrations, loadSeedSchema } from "./index.mjs";
import { repoRoot } from "./paths.mjs";
import { buildPositions, chainFromBuilt } from "./position.mjs";
import { LoopError } from "./cli.mjs";

/** load seed + migrations + chain, fail with exit 1 when they disagree (that is `schema:check`'s job to fix) */
/** `strictSeed: false` tolerates seed != replay (reported as `seedInSync: false`) */
export function loadChainOrFail(root = repoRoot(), { strictSeed = true } = {}) {
	const seed = loadSeedSchema(root);
	const loaded = loadMigrations(root);
	const problems = [...seed.errors, ...loaded.errors];
	if (problems.length) throw new LoopError(EXIT.CHECK_FAILED, "CHECK_FAILED", `seed/migrations are invalid (run npm run schema:check):\n${problems.map((p) => `  ${p.code}: ${p.message}`).join("\n")}`);
	const built = buildPositions(loaded.migrations);
	if (built.errors.length) throw new LoopError(EXIT.CHECK_FAILED, "CHECK_FAILED", `migration chain is invalid (run npm run schema:check):\n${built.errors.map((p) => `  ${p.code}: ${p.message}`).join("\n")}`);
	const chain = chainFromBuilt(built, loaded.migrations);
	const seedInSync = chain.final.hash === seed.hash;
	if (strictSeed && !seedInSync) throw new LoopError(EXIT.CHECK_FAILED, "SEED_DRIFT", "seed/seed.json differs from the migrations (run npm run schema:generate)");
	return { seedInSync, seed, migrations: loaded.migrations, chain, positions: built.positions };
}
