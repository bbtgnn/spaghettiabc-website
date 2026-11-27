import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./paths.mjs";

const EXTENSIONS = new Set([".astro", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".cjs"]);
const ALLOW = "schema-allow-ref";
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function* walk(dir) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) yield* walk(full);
		else if (EXTENSIONS.has(path.extname(e.name))) yield full;
	}
}

/**
 * Heuristic lint: code under src/** must not read fields or collections that a migration removed.
 * A removed field `<slug>` of collection `<c>` is reported in files that mention the collection as a quoted
 * string, on lines matching `data.<slug>`, `data?.<slug>` or a quoted "<slug>". A removed collection is reported
 * where it is passed as a quoted argument/`collection:` value. Allowlist: `// schema-allow-ref` on the line or
 * the line above. -> [{code, file, line, message}]
 */
export function lintRefs(history, root = repoRoot()) {
	const src = path.join(root, "src");
	const fieldsByCollection = [...history.fields].filter(([, set]) => set.size);
	if (!existsSync(src) || (!fieldsByCollection.length && !history.collections.size)) return [];

	const rules = [];
	for (const [collection, slugs] of fieldsByCollection) {
		const quoted = new RegExp(`["'\`]${escape(collection)}["'\`]`);
		for (const slug of slugs) {
			const s = escape(slug);
			rules.push({ file: quoted, line: new RegExp(`\\bdata\\??\\.${s}\\b|["'\`]${s}["'\`]`), code: "REMOVED_FIELD_REFERENCED", what: `removed field ${collection}.${slug}` });
		}
	}
	for (const collection of history.collections) {
		const c = escape(collection);
		const call = new RegExp(`\\(\\s*["'\`]${c}["'\`]|collection\\s*[:=]\\s*["'\`]${c}["'\`]`);
		rules.push({ file: call, line: call, code: "REMOVED_COLLECTION_REFERENCED", what: `removed collection ${collection}` });
	}

	const findings = [];
	for (const file of walk(src)) {
		const text = readFileSync(file, "utf8");
		const applicable = rules.filter((r) => r.file.test(text));
		if (!applicable.length) continue;
		const lines = text.split("\n");
		lines.forEach((line, i) => {
			if (line.includes(ALLOW) || lines[i - 1]?.includes(ALLOW)) return;
			for (const r of applicable)
				if (r.line.test(line)) findings.push({ code: r.code, file: path.relative(root, file), line: i + 1, message: `${path.relative(root, file)}:${i + 1}: references ${r.what} (add "// ${ALLOW}" to allow)` });
		});
	}
	return findings;
}
