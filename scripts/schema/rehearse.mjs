#!/usr/bin/env node
/**
 * schema:rehearse [--keep] [--json] [--update-types]
 *
 * Dress rehearsal of the deploy on a throwaway local server:
 *   1. temp dir with a SQLite DB + uploads (EMDASH_DATABASE_URL / EMDASH_UPLOADS_DIR, read by astro.config.mjs)
 *   2. seed it WITH content from the merge-base seed (`git merge-base HEAD origin/main`, fallback HEAD) with `emdash seed`
 *   3. boot `astro dev` on a free port (--ignore-lock: never touches a running dev server of this checkout)
 *   4. schema:apply --phase all  (dev-bypass setup is done by the script), schema:verify
 *   5. parity: live canonical == pure-model replay == canonical(seed)   (this replaces importing emdash internals)
 *   6. the working tree must be unchanged: emdash-env.d.ts is backed up/restored (the dev server rewrites it) and any
 *      change to tracked files is a failure. `--update-types` keeps the regenerated emdash-env.d.ts instead
 *      (then commit it together with the migration).
 * Always stops the server and deletes the temp dir (also on SIGINT/SIGTERM). Target < 30 s.
 * Exit: 0 ok · 1 verify/parity/working-tree check failed · 4/5/6 propagated from schema:apply · 6 server/seed failure.
 *
 * Implementation: scripts/schema/lib/rehearse.mjs (`rehearse(root, opts)`).
 */
import { pathToFileURL } from "node:url";
import { parseArgs, run } from "./lib/cli.mjs";
import { repoRoot } from "./lib/paths.mjs";
import { rehearse } from "./lib/rehearse.mjs";

const USAGE = "node scripts/schema/rehearse.mjs [--keep] [--json] [--update-types]";

export async function main(argv = process.argv.slice(2)) {
	const opts = parseArgs(argv, { keep: "boolean", json: "boolean", "update-types": "boolean" }, USAGE);
	return rehearse(repoRoot(), {
		keep: Boolean(opts.keep),
		json: Boolean(opts.json),
		updateTypes: Boolean(opts["update-types"]),
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run(() => main());
