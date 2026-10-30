import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";

const seed = JSON.parse(readFileSync(new URL("../seed/seed.json", import.meta.url), "utf8"));
const homepage = seed.collections.find((c) => c.slug === "homepage");
if (!homepage) throw new Error("homepage missing from seed");

const order = homepage.fields.map((f) => f.slug);
const db = new Database("data.db");
const col = db.query("SELECT id FROM _emdash_collections WHERE slug = ?").get("homepage");
if (!col) throw new Error("homepage collection missing in DB");

const existing = db
	.query("SELECT slug FROM _emdash_fields WHERE collection_id = ?")
	.all(col.id)
	.map((r) => r.slug);
const missing = order.filter((s) => !existing.includes(s));
const extra = existing.filter((s) => !order.includes(s));
if (missing.length) console.warn("missing in DB", missing);
if (extra.length) console.warn("extra in DB (kept at end)", extra);

const update = db.prepare(
	"UPDATE _emdash_fields SET sort_order = ? WHERE collection_id = ? AND slug = ?",
);
db.transaction(() => {
	for (let i = 0; i < order.length; i++) {
		update.run(i, col.id, order[i]);
	}
	for (let i = 0; i < extra.length; i++) {
		update.run(order.length + i, col.id, extra[i]);
	}
})();

const rows = db
	.query(
		"SELECT sort_order, slug, label FROM _emdash_fields WHERE collection_id = ? ORDER BY sort_order",
	)
	.all(col.id);
for (const r of rows) {
	console.log(`${r.sort_order}\t${r.slug}\t${r.label}`);
}
