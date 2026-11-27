import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repo root; `SCHEMA_REPO_ROOT` overrides it (tests run the CLIs against temp copies). */
export const repoRoot = () => path.resolve(process.env.SCHEMA_REPO_ROOT || path.join(here, "../../.."));
export const seedPath = (root = repoRoot()) => path.join(root, "seed", "seed.json");
export const migrationsDir = (root = repoRoot()) => path.join(root, "schema", "migrations");
