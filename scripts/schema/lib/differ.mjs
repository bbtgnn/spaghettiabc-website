import { deepEqual } from "./hash.mjs";
import {
	CLEARABLE_COLLECTION_KEYS, CLEARABLE_FIELD_KEYS, SEED_COLLECTION_KEYS, SEED_FIELD_KEYS, TEXT_ALIAS_TYPES,
	describeOp, minimizeCollection, minimizeField, newHistory,
} from "./model.mjs";

/** bad CLI input for --rename / --resolve (generator exit 2) */
export class UsageError extends Error {}

const COLLECTION_KEYS = SEED_COLLECTION_KEYS.filter((k) => k !== "slug");
const FIELD_KEYS = SEED_FIELD_KEYS.filter((k) => k !== "slug");
const NEVER_CLEARABLE = { collection: ["admin"], field: ["defaultValue"] };

/** keys that differ: `set` (value or null=clear) + `unset` keys that cannot be expressed as null */
function propDiff(a, b, keys, kind) {
	const set = {};
	const unclearable = [];
	const clearable = kind === "collection" ? CLEARABLE_COLLECTION_KEYS : CLEARABLE_FIELD_KEYS;
	for (const k of keys) {
		if (deepEqual(a[k], b[k])) continue;
		if (b[k] !== undefined) set[k] = b[k];
		else if (k in clearable) set[k] = null;
		else unclearable.push(k);
	}
	return { set, unclearable };
}

const withoutFields = ({ fields, ...rest }) => rest;
const candidateScore = (x, y) => (x.type === y.type ? 2 : 0) + (x.label === y.label ? 1 : 0);

/** field order right before the post phase: final order, with fields about to be removed re-inserted where they were */
function preOrder(oldFields, newFields, removed) {
	const out = newFields.map((f) => f.slug);
	for (const r of oldFields.filter((f) => removed.has(f.slug))) {
		let at = 0;
		for (let i = oldFields.findIndex((f) => f.slug === r.slug) - 1; i >= 0; i--) {
			const j = out.indexOf(oldFields[i].slug);
			if (j !== -1) {
				at = j + 1;
				break;
			}
		}
		out.splice(at, 0, r.slug);
	}
	return out;
}

/**
 * diffSchemas(oldCanonical, newCanonical, opts) -> { ops, pre, post, backfills, stops, notes }
 *
 * opts: renames [{collection, from, to}] (expand form: addField to + backfill, post removeField from);
 *       dropAdd ["coll.old,coll.new" | "oldColl,newColl"] (accept remove+add, data is dropped);
 *       allowDestructive (else any post-phase op is a STOP); history (removed slugs of earlier migrations).
 * Deterministic. When `stops` is non-empty `ops`/`pre`/`post` are empty. Each stop: {code, details, hint}.
 * DESTRUCTIVE_NOT_ALLOWED is only reported when nothing else stops the change.
 * Ops are pre-then-post: creates, per-collection updateField/addField, deferred forward references, reorderFields,
 * collection props, reorderCollections | removeField, deleteCollection.
 */
export function diffSchemas(oldC, newC, opts = {}) {
	const { renames = [], dropAdd = [], allowDestructive = false } = opts;
	const history = opts.history ?? newHistory();
	const pre = [];
	const post = [];
	const backfills = [];
	const stops = [];
	const notes = [];
	const stop = (code, details, hint) => stops.push({ code, details, hint });

	const fieldPairs = new Set();
	const colPairs = new Set();
	for (const s of dropAdd) {
		const [a, b, ...extra] = s.split(",");
		if (!a || !b || extra.length) throw new UsageError(`--resolve drop-add:${s}: expected drop-add:<old>,<new> (collection.field,collection.field or collection,collection)`);
		(a.includes(".") ? fieldPairs : colPairs).add(`${a},${b}`);
	}

	const oldBy = new Map(oldC.collections.map((c) => [c.slug, c]));
	const newBy = new Map(newC.collections.map((c) => [c.slug, c]));
	const removedCols = oldC.collections.filter((c) => !newBy.has(c.slug)).map((c) => c.slug);
	const addedCols = newC.collections.filter((c) => !oldBy.has(c.slug)).map((c) => c.slug);

	for (const a of addedCols)
		if (history.collections.has(a)) stop("SLUG_REUSE", { collection: a, message: `collection slug "${a}" was removed by an earlier migration` }, `choose a different slug for the new collection`);

	if (removedCols.length && addedCols.length) {
		const candidates = [];
		for (const r of removedCols)
			for (const a of addedCols) {
				if (colPairs.has(`${r},${a}`)) continue;
				const ro = new Set(oldBy.get(r).fields.map((f) => f.slug));
				const names = newBy.get(a).fields.map((f) => f.slug);
				const overlap = names.filter((s) => ro.has(s)).length / Math.max(ro.size, names.length, 1);
				candidates.push({ removed: r, added: a, fieldOverlap: +overlap.toFixed(2) });
			}
		if (candidates.length)
			stop("AMBIGUOUS_COLLECTION_RENAME", { message: "collections removed and added in the same change: possible rename (no rename op exists; drop+create loses content)", removed: removedCols, added: addedCols, candidates },
				`if it is NOT a rename: ${candidates.map((p) => `--resolve drop-add:${p.removed},${p.added}`).join(" ")} --allow-destructive. A rename needs a manual content migration.`);
	}

	// reference targets that exist at a given point (forward references are added after every create)
	const exists = new Set(oldBy.keys());
	const deferred = [];
	const current = new Map(oldC.collections.map((c) => [c.slug, c.fields.map((f) => f.slug)]));
	const refTarget = (f) => (f.type === "reference" ? f.validation?.targetCollection : undefined);
	const isForward = (f, self) => {
		const t = refTarget(f);
		return Boolean(t) && t !== self && !exists.has(t);
	};

	// (a) creates, in canonical collection order
	for (const c of newC.collections) {
		if (oldBy.has(c.slug)) continue;
		const inline = [];
		for (const f of c.fields) {
			if (isForward(f, c.slug)) deferred.push({ collection: c.slug, field: f });
			else inline.push(f);
		}
		exists.add(c.slug);
		pre.push({ op: "createCollection", collection: minimizeCollection(c), fields: inline.map(minimizeField) });
		current.set(c.slug, inline.map((f) => f.slug));
	}

	// (b) existing collections
	const removals = [];
	const propOps = [];
	const removedOf = new Map();
	for (const c of newC.collections) {
		const o = oldBy.get(c.slug);
		if (!o) continue;
		const oF = new Map(o.fields.map((f) => [f.slug, f]));
		const nF = new Map(c.fields.map((f) => [f.slug, f]));
		const removedAll = o.fields.filter((f) => !nF.has(f.slug));
		const addedAll = c.fields.filter((f) => !oF.has(f.slug));
		removedOf.set(c.slug, new Set(removedAll.map((f) => f.slug)));

		const mine = renames.filter((r) => r.collection === c.slug);
		for (const r of mine)
			if (!removedAll.some((f) => f.slug === r.from) || !addedAll.some((f) => f.slug === r.to))
				throw new UsageError(`--rename ${c.slug}.${r.from}=${r.to}: "${r.from}" must be removed from and "${r.to}" added to the seed collection "${c.slug}"`);
		const renamedFrom = new Set(mine.map((r) => r.from));
		const renamedTo = new Set(mine.map((r) => r.to));
		const removed = removedAll.filter((f) => !renamedFrom.has(f.slug));
		const added = addedAll.filter((f) => !renamedTo.has(f.slug));

		if (removed.length && added.length) {
			const candidates = [];
			for (const r of removed)
				for (const a of added) {
					if (fieldPairs.has(`${c.slug}.${r.slug},${c.slug}.${a.slug}`)) continue;
					candidates.push({ removed: r.slug, added: a.slug, sameType: r.type === a.type, sameLabel: r.label === a.label, score: candidateScore(r, a) });
				}
			candidates.sort((x, y) => y.score - x.score || (x.removed + x.added < y.removed + y.added ? -1 : 1));
			if (candidates.length)
				stop("AMBIGUOUS_FIELD_RENAME", { message: `collection "${c.slug}" has removed and added fields: possible rename (EmDash has no rename; drop+add destroys the data)`, collection: c.slug, removed: removed.map((f) => f.slug), added: added.map((f) => f.slug), candidates },
					`rename (copy data): --rename ${c.slug}.<old>=<new> --allow-destructive. Not a rename (drop data): --resolve drop-add:${c.slug}.<old>,${c.slug}.<new> --allow-destructive. Candidates: ${candidates.map((p) => `${c.slug}.${p.removed}=${p.added}`).join(", ")}`);
		}
		for (const f of addedAll)
			if (history.fields.get(c.slug)?.has(f.slug))
				stop("SLUG_REUSE", { collection: c.slug, field: f.slug, message: `field slug "${c.slug}.${f.slug}" was removed by an earlier migration` }, `use a different slug (a removed slug can resurrect old revision data)`);

		for (const f of c.fields) {
			const of = oF.get(f.slug);
			if (!of) continue;
			const at = `${c.slug}.${f.slug}`;
			const { set, unclearable } = propDiff(of, f, FIELD_KEYS, "field");
			if (!Object.keys(set).length && !unclearable.length) continue;
			const expand = `expand: add a new field slug with the final type/flags in seed.json (required:true is allowed at creation), keep the old one, then run schema:generate -- --rename ${at}=<new> --allow-destructive`;
			if ("type" in set && !(TEXT_ALIAS_TYPES.has(of.type) && TEXT_ALIAS_TYPES.has(f.type)))
				stop("FIELD_TYPE_CHANGE_UNSUPPORTED", { message: `${at}: type ${of.type} -> ${f.type} (server: FIELD_TYPE_COLUMN_CHANGE)`, at, from: of.type, to: f.type }, expand);
			for (const k of ["required", "unique"])
				if (k in set) stop("FIELD_FLAG_CHANGE_REFUSED", { message: `${at}: ${k} ${of[k]} -> ${f[k]} (server: FIELD_UPDATE_REQUIRES_MIGRATION, always)`, at, flag: k }, expand);
			if (set.translatable === false)
				stop("FIELD_FLAG_CHANGE_REFUSED", { message: `${at}: translatable true -> false (server: FIELD_UPDATE_REQUIRES_MIGRATION, always)`, at, flag: "translatable" }, expand);
			if (of.type === "reference" && f.type === "reference") {
				const a = of.validation ?? {};
				const b = f.validation ?? {};
				if (a.targetCollection !== b.targetCollection || (a.multiple ?? false) !== (b.multiple ?? false))
					stop("REFERENCE_CHANGE_UNSUPPORTED", { message: `${at}: reference targetCollection/multiple change`, at, from: { targetCollection: a.targetCollection, multiple: a.multiple ?? false }, to: { targetCollection: b.targetCollection, multiple: b.multiple ?? false } }, expand);
			}
			for (const k of unclearable)
				stop("PROPERTY_NOT_CLEARABLE", { message: `${at}: ${k} cannot be removed through the REST API`, at, property: k }, k === "defaultValue" ? "set an explicit new default instead" : "keep the property");
			if (Object.keys(set).length) pre.push({ op: "updateField", collection: c.slug, field: f.slug, set });
		}

		for (const f of addedAll) {
			if (isForward(f, c.slug)) deferred.push({ collection: c.slug, field: f });
			else {
				pre.push({ op: "addField", collection: c.slug, field: minimizeField(f) });
				current.get(c.slug).push(f.slug);
			}
		}
		for (const r of mine) {
			const from = oF.get(r.from);
			const to = nF.get(r.to);
			const sameKind = from.type === to.type || (TEXT_ALIAS_TYPES.has(from.type) && TEXT_ALIAS_TYPES.has(to.type));
			backfills.push({ id: `${c.slug}-${r.to}`, collection: c.slug, to: r.to, from: r.from, transform: sameKind ? "copy" : "module", locales: to.translatable ? "all" : "default" });
		}
		for (const f of removedAll) removals.push({ op: "removeField", collection: c.slug, field: f.slug });

		const cp = propDiff(withoutFields(o), withoutFields(c), COLLECTION_KEYS, "collection");
		for (const k of cp.unclearable)
			stop("PROPERTY_NOT_CLEARABLE", { message: `${c.slug}: collection.${k} cannot be removed through the REST API`, at: c.slug, property: k }, "keep the property");
		propOps.push({ collection: c.slug, set: cp.set });
	}

	// (c) forward references once every target exists
	for (const d of deferred) {
		pre.push({ op: "addField", collection: d.collection, field: minimizeField(d.field) });
		current.get(d.collection).push(d.field.slug);
	}

	// (d) field order, as it must look before the post phase removes fields
	for (const c of newC.collections) {
		const o = oldBy.get(c.slug);
		const wanted = preOrder(o?.fields ?? [], c.fields, removedOf.get(c.slug) ?? new Set());
		if (!deepEqual(current.get(c.slug), wanted)) pre.push({ op: "reorderFields", collection: c.slug, slugs: wanted });
	}

	// (e) collection props last (titleField/dateField are validated against existing fields)
	const withOrder = newC.collections.filter((c) => c.sortOrder !== undefined);
	const sortChanged = propOps.filter((x) => "sortOrder" in x.set);
	const reproducible = withOrder.length > 0 && withOrder.every((c, i) => c.sortOrder === i);
	const useReorder = sortChanged.length >= 2 && reproducible;
	if (useReorder) for (const x of sortChanged) delete x.set.sortOrder;
	for (const x of propOps) if (Object.keys(x.set).length) pre.push({ op: "updateCollection", collection: x.collection, set: x.set });
	if (useReorder) pre.push({ op: "reorderCollections", slugs: withOrder.map((c) => c.slug) });

	// post phase
	post.push(...removals);
	for (const slug of removedCols) post.push({ op: "deleteCollection", collection: slug });

	if (!stops.length && post.length && !allowDestructive)
		stop("DESTRUCTIVE_NOT_ALLOWED", { message: "this change removes data (removeField/deleteCollection run after the code deploy and drop columns/content)", ops: post.map(describeOp) }, "re-run with --allow-destructive (migration is marked destructive; CI takes a D1 Time Travel bookmark first)");

	if (stops.length) return { ops: [], pre: [], post: [], backfills: [], stops, notes };
	return { ops: [...pre, ...post], pre, post, backfills, stops, notes };
}
