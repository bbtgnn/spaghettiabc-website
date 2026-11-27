/**
 * Pure JavaScript model of EmDash 1.6.0 schema semantics. SINGLE source for:
 *   1. the defaults table (what a collection/field looks like when the seed omits a key),
 *   2. the canonical form (normalizers),
 *   3. the refusal rules (what the schema registry rejects, with the server's error codes),
 *   4. the op semantics (`applyOps`: ops applied to canonical state).
 *
 * Nothing here imports EmDash. `schema:rehearse` boots a real server, applies the migrations over HTTP and
 * compares the live hash with the hash computed here; any divergence means this file is wrong (or EmDash
 * changed). When bumping `emdash`, re-run the rehearsal and update this file, not the migrations.
 *
 * Op payloads are SEED-SHAPED (same keys as `seed.json` collections/fields; omitted key == default).
 * In `set`, `null` clears a clearable key (see CLEARABLE_*); everything else is a literal value.
 *
 * Error codes: those marked "server" are what EmDash 1.6.0 returns (HTTP 400). Those in MODEL_ONLY_CODES are
 * stricter than, or not reported by, the server; they exist because the loop must reject ambiguous or
 * non-reproducible states offline.
 */

export const CANONICAL_VERSION = 1;

/** collection sort when `sortOrder` is unset: registry `collectionOrder` = coalesce(sort_order, 2147483647) */
export const SORT_LAST = 2147483647;

export const MODEL_ONLY_CODES = new Set([
	"SLUG_REUSE",
	"REFERENCE_TARGET_NOT_FOUND",
	"REFERENCE_CHANGE_UNSUPPORTED",
	"PROPERTY_NOT_CLEARABLE",
	"COLLECTION_REFERENCED",
]);

// ---------------------------------------------------------------------------------------------
// 1. Defaults table. Where each default comes from in emdash 1.6.0 (chunk names change per release).
// ---------------------------------------------------------------------------------------------

export const COLLECTION_DEFAULTS = {
	/** applySeed: `supports: collection.supports || []`. NOT the REST default ["drafts","revisions"]: appliers must send `supports` explicitly. */
	supports: [],
	/** registry: `routable === false ? 0 : 1` */
	routable: true,
	hidden: false,
	commentsEnabled: false,
	/** mapCollectionRow fallback + column default */
	commentsModeration: "first_time",
	commentsClosedAfterDays: 90,
	/** Surprise: DB column default is 1 (core migration 071) and neither applySeed nor REST create sets it. */
	commentsAutoApproveUsers: true,
	/** registry: `editLocking === false ? 0 : 1` */
	editLocking: true,
};

export const FIELD_DEFAULTS = {
	required: false,
	unique: false,
	searchable: false,
	indexed: false,
	/** registry: `translatable === false ? 0 : 1` (a seed passes `undefined` straight through => 1) */
	translatable: true,
};

/**
 * Other normalisations (both seed and live side), so ops stay lossless:
 *  - `hasSeo` = supports includes "seo" on the seed side (registry derives it; re-derived on `supports` change).
 *  - `supports` sorted (set semantics).
 *  - optional strings labelSingular/description/icon/group/urlPattern/widget: ""/null -> absent (icon, group trimmed).
 *  - `admin` keeps only `listColumns` (string[]) and `quickCreate` (boolean).
 *  - field `defaultValue` absent unless !== undefined; `null`, 0, "" and false are real values.
 *  - field `validation`/`widget`/`options` null/""/{} -> absent.
 *  - dropped as derived/volatile: ids, timestamps, columnType, source, collectionId, field sortOrder (array
 *    position is the order), `validation.relation`, `validation.relationSide`.
 */

export const FIELD_TYPE_TO_COLUMN = {
	string: "TEXT",
	text: "TEXT",
	number: "REAL",
	integer: "INTEGER",
	boolean: "INTEGER",
	datetime: "TEXT",
	select: "TEXT",
	multiSelect: "JSON",
	portableText: "JSON",
	image: "TEXT",
	file: "TEXT",
	reference: "TEXT",
	json: "JSON",
	slug: "TEXT",
	url: "TEXT",
	repeater: "JSON",
	blocks: "JSON",
};

export const TEXT_ALIAS_TYPES = new Set(["string", "text", "slug"]);
const TITLE_FIELD_TYPES = TEXT_ALIAS_TYPES;
const SYSTEM_DATE_FIELDS = new Set(["publishedAt", "createdAt", "updatedAt"]);

const RESERVED_COLLECTION_SLUGS = new Set([
	"content", "media", "users", "revisions", "taxonomies", "options", "audit_logs", "reorder", "relations",
]);
const RESERVED_FIELD_SLUGS = new Set([
	"id", "slug", "status", "author_id", "primary_byline_id", "created_at", "updated_at", "published_at",
	"scheduled_at", "deleted_at", "version", "live_revision_id", "draft_revision_id", "terms", "bylines", "byline",
]);
const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;
const MAX_SLUG_LENGTH = 63;

// ---------------------------------------------------------------------------------------------
// 2. Canonical form
// ---------------------------------------------------------------------------------------------

const emptyToAbsent = (v) => (v === "" || v === null || v === undefined ? undefined : v);

function normValidation(v) {
	if (v === null || v === undefined) return undefined;
	const { relation, relationSide, ...rest } = v;
	void relation;
	void relationSide;
	return rest;
}

export function normalizeField(f) {
	const validation = normValidation(f.validation);
	return {
		slug: f.slug,
		label: f.label,
		type: f.type,
		required: f.required === true,
		unique: f.unique === true,
		searchable: f.searchable === true,
		indexed: f.indexed === true,
		translatable: f.translatable !== false,
		...(f.defaultValue !== undefined ? { defaultValue: f.defaultValue } : {}),
		...(validation !== undefined ? { validation } : {}),
		...(emptyToAbsent(f.widget) !== undefined ? { widget: f.widget } : {}),
		...(emptyToAbsent(f.options) !== undefined && Object.keys(f.options).length ? { options: f.options } : {}),
	};
}

function normalizeAdmin(a) {
	if (!a || typeof a !== "object") return undefined;
	const out = {};
	if (Array.isArray(a.listColumns)) out.listColumns = a.listColumns.filter((x) => typeof x === "string");
	if (typeof a.quickCreate === "boolean") out.quickCreate = a.quickCreate;
	return out;
}

/** `live: true` reads server-derived `hasSeo`/`commentsAutoApproveUsers`; seed side derives/defaults them. */
export function normalizeCollection(c, { live = false } = {}) {
	const D = COLLECTION_DEFAULTS;
	const supports = [...(c.supports ?? D.supports)].sort();
	const o = {
		slug: c.slug,
		label: c.label,
		supports,
		hasSeo: live ? c.hasSeo === true : supports.includes("seo"),
		routable: c.routable !== false,
		hidden: c.hidden === true,
		commentsEnabled: c.commentsEnabled === true,
		commentsModeration: ["all", "first_time", "none"].includes(c.commentsModeration)
			? c.commentsModeration
			: D.commentsModeration,
		commentsClosedAfterDays: c.commentsClosedAfterDays ?? D.commentsClosedAfterDays,
		commentsAutoApproveUsers: live ? c.commentsAutoApproveUsers === true : c.commentsAutoApproveUsers !== false,
		editLocking: c.editLocking !== false,
	};
	for (const k of ["labelSingular", "description", "icon", "group", "urlPattern", "titleField", "dateField"]) {
		let v = c[k];
		if (typeof v === "string" && (k === "icon" || k === "group")) v = v.trim();
		if (emptyToAbsent(v) !== undefined) o[k] = v;
	}
	const admin = normalizeAdmin(c.admin);
	if (admin) o.admin = admin;
	if (c.sortOrder !== undefined && c.sortOrder !== null) o.sortOrder = c.sortOrder;
	o.fields = (c.fields ?? []).map(normalizeField);
	return o;
}

export function sortCollections(cols) {
	return cols.sort(
		(a, b) =>
			(a.sortOrder ?? SORT_LAST) - (b.sortOrder ?? SORT_LAST) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
	);
}

export const emptyCanonical = () => ({ v: CANONICAL_VERSION, collections: [] });

// ---------------------------------------------------------------------------------------------
// Minimal seed-shaped payloads (what generated migrations carry). normalize(minimize(x)) == x.
// ---------------------------------------------------------------------------------------------

const COLLECTION_KEY_ORDER = [
	"slug", "label", "labelSingular", "description", "icon", "group", "urlPattern", "titleField", "dateField",
	"admin", "sortOrder", "supports", "routable", "hidden", "commentsEnabled", "editLocking",
];
const FIELD_KEY_ORDER = [
	"slug", "label", "type", "required", "unique", "searchable", "indexed", "translatable", "defaultValue",
	"validation", "widget", "options",
];

/** canonical collection (fields ignored) -> seed-shaped, default-valued keys omitted, `supports` always explicit */
export function minimizeCollection(c) {
	const out = {};
	for (const k of COLLECTION_KEY_ORDER) {
		if (c[k] === undefined) continue;
		if (k !== "supports" && k in COLLECTION_DEFAULTS && c[k] === COLLECTION_DEFAULTS[k]) continue;
		out[k] = c[k];
	}
	return out;
}

export function minimizeField(f) {
	const out = {};
	for (const k of FIELD_KEY_ORDER) {
		if (f[k] === undefined) continue;
		if (k in FIELD_DEFAULTS && f[k] === FIELD_DEFAULTS[k]) continue;
		out[k] = f[k];
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// 3. Op shapes, phases, REST clearing
// ---------------------------------------------------------------------------------------------

/** keys a seed collection may declare (everything the seed schema allows; comments* beyond commentsEnabled cannot be seeded) */
export const SEED_COLLECTION_KEYS = [
	"slug", "label", "labelSingular", "description", "icon", "admin", "supports", "urlPattern", "routable",
	"hidden", "sortOrder", "group", "commentsEnabled", "editLocking", "titleField", "dateField",
];
export const SEED_FIELD_KEYS = [
	"slug", "label", "type", "required", "unique", "searchable", "indexed", "translatable", "defaultValue",
	"validation", "widget", "options",
];
const COLLECTION_SET_KEYS = SEED_COLLECTION_KEYS.filter((k) => k !== "slug");
const FIELD_SET_KEYS = SEED_FIELD_KEYS.filter((k) => k !== "slug");

/** keys whose `null` in `set` means "unset" (value = what the REST update must send to clear it) */
export const CLEARABLE_COLLECTION_KEYS = {
	labelSingular: "",
	description: "",
	icon: "",
	urlPattern: null,
	group: null,
	sortOrder: null,
	titleField: null,
	dateField: null,
};
export const CLEARABLE_FIELD_KEYS = { validation: null, widget: "", options: {} };
/** `defaultValue: null` is the literal JSON null (REST cannot remove a default); `admin` cannot be cleared either. */

export const OP_NAMES = [
	"createCollection", "updateCollection", "deleteCollection", "reorderCollections",
	"addField", "updateField", "removeField", "reorderFields",
];

export const phaseOf = (op) => (op.op === "removeField" || op.op === "deleteCollection" ? "post" : "pre");
export const isDestructive = (op) => phaseOf(op) === "post";

/** split into pre/post; `ordered` is false if a pre op follows a post op (migrations must be pre-then-post) */
export function splitOps(ops) {
	const k = ops.findIndex((o) => phaseOf(o) === "post");
	const split = k === -1 ? ops.length : k;
	const pre = ops.slice(0, split);
	const post = ops.slice(split);
	return { pre, post, ordered: post.every((o) => phaseOf(o) === "post") };
}

export function describeOp(op) {
	switch (op.op) {
		case "createCollection": return `createCollection ${op.collection?.slug}`;
		case "updateCollection": case "deleteCollection": return `${op.op} ${op.collection}`;
		case "reorderCollections": return "reorderCollections";
		case "reorderFields": return `reorderFields ${op.collection}`;
		default: return `${op.op} ${op.collection}.${typeof op.field === "string" ? op.field : op.field?.slug}`;
	}
}

// ---------------------------------------------------------------------------------------------
// 4. Op semantics + refusal rules
// ---------------------------------------------------------------------------------------------

export class ModelError extends Error {
	constructor(code, message, details) {
		super(message);
		this.name = "ModelError";
		this.code = code;
		this.status = 400;
		this.details = details;
		this.serverCode = !MODEL_ONLY_CODES.has(code);
	}
}

const fail = (code, message, details) => {
	throw new ModelError(code, message, details);
};

/** Slugs removed so far, per collection. Mutated by `applyOps` when passed in. */
export const newHistory = () => ({ collections: new Set(), fields: new Map() });
export function cloneHistory(h) {
	return { collections: new Set(h.collections), fields: new Map([...h.fields].map(([k, v]) => [k, new Set(v)])) };
}

function checkKeys(obj, allowed, where) {
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) fail("VALIDATION_ERROR", `${where}: expected an object`);
	for (const k of Object.keys(obj)) if (!allowed.includes(k)) fail("VALIDATION_ERROR", `${where}: unknown key "${k}"`);
}

function checkSlug(slug, kind) {
	if (typeof slug !== "string" || !SLUG_PATTERN.test(slug) || slug.length > MAX_SLUG_LENGTH)
		fail("INVALID_SLUG", `${kind} slug "${slug}" must match ${SLUG_PATTERN} and be at most ${MAX_SLUG_LENGTH} characters`);
	const reserved = kind === "Collection" ? RESERVED_COLLECTION_SLUGS : RESERVED_FIELD_SLUGS;
	if (reserved.has(slug)) fail("RESERVED_SLUG", `${kind} slug "${slug}" is reserved`);
}

function checkFieldPayload(f, where) {
	checkKeys(f, SEED_FIELD_KEYS, where);
	for (const k of ["slug", "label", "type"])
		if (typeof f[k] !== "string" || !f[k]) fail("VALIDATION_ERROR", `${where}: "${k}" must be a non-empty string`);
	if (!(f.type in FIELD_TYPE_TO_COLUMN)) fail("VALIDATION_ERROR", `${where}: unknown field type "${f.type}"`);
	for (const k of ["required", "unique", "searchable", "indexed", "translatable"])
		if (f[k] !== undefined && typeof f[k] !== "boolean") fail("VALIDATION_ERROR", `${where}: "${k}" must be boolean`);
	if (f.type === "reference" && typeof f.validation?.targetCollection !== "string")
		fail("VALIDATION_ERROR", `${where}: reference fields need validation.targetCollection`);
}

function checkRefTarget(cols, f, selfSlug) {
	const t = f.type === "reference" ? f.validation?.targetCollection : undefined;
	if (t && t !== selfSlug && !cols.some((c) => c.slug === t))
		fail("REFERENCE_TARGET_NOT_FOUND", `reference field "${f.slug}" targets unknown collection "${t}"`, { target: t });
}

function checkTitleDate(c) {
	const type = (slug) => c.fields.find((f) => f.slug === slug)?.type;
	if (c.titleField !== undefined) {
		const t = type(c.titleField);
		if (t === undefined) fail("INVALID_TITLE_FIELD", `titleField "${c.titleField}" is not a field on "${c.slug}"`);
		if (!TITLE_FIELD_TYPES.has(t)) fail("INVALID_TITLE_FIELD", `titleField "${c.titleField}" must be a text field (got "${t}")`);
	}
	if (c.dateField !== undefined && !SYSTEM_DATE_FIELDS.has(c.dateField)) {
		const t = type(c.dateField);
		if (t === undefined) fail("INVALID_DATE_FIELD", `dateField "${c.dateField}" is not a field on "${c.slug}"`);
		if (t !== "datetime") fail("INVALID_DATE_FIELD", `dateField "${c.dateField}" must be a datetime field (got "${t}")`);
	}
}

/** apply `set` onto a canonical entity: null clears CLEARABLE keys; other nulls are invalid */
function mergeSet(cur, set, clearable, where, extraNullOk = []) {
	const merged = { ...cur };
	for (const [k, v] of Object.entries(set)) {
		if (v === null && k in clearable) delete merged[k];
		else if (v === null && extraNullOk.includes(k)) merged[k] = null;
		else if (v === null && k === "admin") fail("PROPERTY_NOT_CLEARABLE", `${where}: "admin" cannot be unset through the REST API`);
		else if (v === null) fail("VALIDATION_ERROR", `${where}: "${k}" cannot be null`);
		else merged[k] = v;
	}
	return merged;
}

function applyOp(ctx, op) {
	const { cols, history } = ctx;
	const col = (slug) => {
		const c = cols.find((x) => x.slug === slug);
		if (!c) fail("COLLECTION_NOT_FOUND", `Collection "${slug}" not found`);
		return c;
	};
	const removedFields = (slug) => history.fields.get(slug) ?? history.fields.set(slug, new Set()).get(slug);
	switch (op.op) {
		case "createCollection": {
			checkKeys(op, ["op", "collection", "fields"], "createCollection");
			checkKeys(op.collection, SEED_COLLECTION_KEYS, "createCollection.collection");
			if (!Array.isArray(op.fields)) fail("VALIDATION_ERROR", "createCollection.fields must be an array");
			if (!Array.isArray(op.collection.supports))
				fail("VALIDATION_ERROR", "createCollection.collection.supports must be explicit (REST and seed defaults differ)");
			if (typeof op.collection.label !== "string" || !op.collection.label) fail("VALIDATION_ERROR", "createCollection.collection.label is required");
			checkSlug(op.collection.slug, "Collection");
			if (cols.some((c) => c.slug === op.collection.slug)) fail("COLLECTION_EXISTS", `Collection "${op.collection.slug}" already exists`);
			if (history.collections.has(op.collection.slug)) fail("SLUG_REUSE", `Collection slug "${op.collection.slug}" was removed by an earlier migration`);
			const seen = new Set();
			for (const f of op.fields) {
				checkFieldPayload(f, `createCollection.fields[${f?.slug}]`);
				checkSlug(f.slug, "Field");
				if (seen.has(f.slug)) fail("FIELD_EXISTS", `Field "${f.slug}" already exists in collection "${op.collection.slug}"`);
				seen.add(f.slug);
			}
			const next = normalizeCollection({ ...op.collection, fields: op.fields });
			for (const f of next.fields) checkRefTarget(cols, f, next.slug);
			checkTitleDate(next);
			cols.push(next);
			sortCollections(cols);
			return;
		}
		case "updateCollection": {
			checkKeys(op, ["op", "collection", "set"], "updateCollection");
			const cur = col(op.collection);
			checkKeys(op.set, COLLECTION_SET_KEYS, "updateCollection.set");
			const next = normalizeCollection(mergeSet(cur, op.set, CLEARABLE_COLLECTION_KEYS, `updateCollection ${cur.slug}`));
			checkTitleDate(next);
			Object.assign(cur, next);
			for (const k of Object.keys(cur)) if (!(k in next)) delete cur[k];
			sortCollections(cols);
			return;
		}
		case "deleteCollection": {
			checkKeys(op, ["op", "collection"], "deleteCollection");
			col(op.collection);
			const holder = cols.find((c) => c.slug !== op.collection && c.fields.some((f) => f.type === "reference" && f.validation?.targetCollection === op.collection));
			if (holder) fail("COLLECTION_REFERENCED", `Collection "${op.collection}" is still referenced by ${holder.slug}`);
			history.collections.add(op.collection);
			cols.splice(cols.findIndex((c) => c.slug === op.collection), 1);
			return;
		}
		case "reorderCollections": {
			checkKeys(op, ["op", "slugs"], "reorderCollections");
			if (!Array.isArray(op.slugs)) fail("VALIDATION_ERROR", "reorderCollections.slugs must be an array");
			const unknown = op.slugs.filter((s) => !cols.some((c) => c.slug === s));
			if (unknown.length) fail("COLLECTION_NOT_FOUND", `Unknown collection: ${unknown.join(", ")}`, { slugs: unknown });
			const dup = op.slugs.filter((s, i) => op.slugs.indexOf(s) !== i);
			if (dup.length) fail("DUPLICATE_SLUG", `Duplicate collection: ${[...new Set(dup)].join(", ")}`);
			// server: listed collections get sort_order = index, every other collection is cleared
			for (const c of cols) {
				const i = op.slugs.indexOf(c.slug);
				if (i === -1) delete c.sortOrder;
				else c.sortOrder = i;
			}
			sortCollections(cols);
			return;
		}
		case "addField": {
			checkKeys(op, ["op", "collection", "field"], "addField");
			const c = col(op.collection);
			checkFieldPayload(op.field, `addField ${c.slug}.${op.field?.slug}`);
			checkSlug(op.field.slug, "Field");
			if (c.fields.some((f) => f.slug === op.field.slug)) fail("FIELD_EXISTS", `Field "${op.field.slug}" already exists in collection "${c.slug}"`);
			if (removedFields(c.slug).has(op.field.slug)) fail("SLUG_REUSE", `Field slug "${c.slug}.${op.field.slug}" was removed by an earlier migration`);
			const f = normalizeField(op.field);
			checkRefTarget(cols, f, c.slug);
			c.fields.push(f);
			return;
		}
		case "updateField": {
			checkKeys(op, ["op", "collection", "field", "set"], "updateField");
			const c = col(op.collection);
			const idx = c.fields.findIndex((f) => f.slug === op.field);
			if (idx === -1) fail("FIELD_NOT_FOUND", `Field "${op.field}" not found in collection "${c.slug}"`);
			const cur = c.fields[idx];
			const at = `${c.slug}.${cur.slug}`;
			checkKeys(op.set, FIELD_SET_KEYS, `updateField ${at}.set`);
			for (const k of ["required", "unique", "searchable", "indexed", "translatable"])
				if (op.set[k] !== undefined && typeof op.set[k] !== "boolean") fail("VALIDATION_ERROR", `updateField ${at}: "${k}" must be boolean`);
			const set = op.set;
			if (set.type !== undefined && set.type !== cur.type) {
				if (!(set.type in FIELD_TYPE_TO_COLUMN)) fail("VALIDATION_ERROR", `updateField ${at}: unknown field type "${set.type}"`);
				// registry order: storage-less vs column-backed, column type, text-alias, titleField/dateField
				if (cur.type === "reference" || FIELD_TYPE_TO_COLUMN[set.type] !== FIELD_TYPE_TO_COLUMN[cur.type])
					fail("FIELD_TYPE_COLUMN_CHANGE", `Cannot change field "${at}" from type "${cur.type}" to "${set.type}": the underlying storage would change`);
				if (!TEXT_ALIAS_TYPES.has(cur.type) || !TEXT_ALIAS_TYPES.has(set.type))
					fail("FIELD_TYPE_CHANGE_REQUIRES_MIGRATION", `Cannot change field "${at}" from type "${cur.type}" to "${set.type}" without a manual content migration`);
				if (c.titleField === cur.slug && !TITLE_FIELD_TYPES.has(set.type)) fail("INVALID_TITLE_FIELD", `titleField "${cur.slug}" must stay a text field, not "${set.type}"`);
				if (c.dateField === cur.slug && set.type !== "datetime") fail("INVALID_DATE_FIELD", `dateField "${cur.slug}" must stay a datetime field, not "${set.type}"`);
			}
			if (set.required !== undefined && set.required !== cur.required) fail("FIELD_UPDATE_REQUIRES_MIGRATION", `Changing required for field "${at}" requires a manual content migration.`);
			if (set.unique !== undefined && set.unique !== cur.unique) fail("FIELD_UPDATE_REQUIRES_MIGRATION", `Changing unique for field "${at}" requires a manual content migration.`);
			if (set.translatable === false && cur.translatable) fail("FIELD_UPDATE_REQUIRES_MIGRATION", `Changing field "${at}" to non-translatable requires a manual content migration.`);
			if (cur.type === "reference" && set.validation !== undefined) {
				const a = cur.validation ?? {}, b = normValidation(set.validation) ?? {};
				if (a.targetCollection !== b.targetCollection) fail("VALIDATION_ERROR", `Changing the reference target of "${at}" is not supported`);
				if ((a.multiple ?? false) !== (b.multiple ?? false)) fail("REFERENCE_CHANGE_UNSUPPORTED", `Changing "multiple" on reference "${at}" drifts from the relation limit`);
			}
			c.fields[idx] = normalizeField(mergeSet(cur, set, CLEARABLE_FIELD_KEYS, `updateField ${at}`, ["defaultValue"]));
			return;
		}
		case "removeField": {
			checkKeys(op, ["op", "collection", "field"], "removeField");
			const c = col(op.collection);
			if (!c.fields.some((f) => f.slug === op.field)) fail("FIELD_NOT_FOUND", `Field "${op.field}" not found in collection "${c.slug}"`);
			c.fields = c.fields.filter((f) => f.slug !== op.field);
			if (c.titleField === op.field) delete c.titleField;
			if (c.dateField === op.field) delete c.dateField;
			removedFields(c.slug).add(op.field);
			return;
		}
		case "reorderFields": {
			checkKeys(op, ["op", "collection", "slugs"], "reorderFields");
			const c = col(op.collection);
			const have = c.fields.map((f) => f.slug);
			const ok = Array.isArray(op.slugs) && op.slugs.length === have.length && have.every((s) => op.slugs.includes(s)) && new Set(op.slugs).size === have.length;
			if (!ok) fail("REORDER_MISMATCH", `reorderFields ${c.slug}: slugs must list exactly the current fields`, { have, got: op.slugs });
			c.fields = op.slugs.map((s) => c.fields.find((f) => f.slug === s));
			return;
		}
		default:
			fail("VALIDATION_ERROR", `unknown op "${op.op}"`);
	}
}

/**
 * Apply ops to a canonical schema. Pure: returns a new canonical schema, input untouched.
 * `history` (optional, mutated) tracks removed slugs across calls for the SLUG_REUSE rule.
 * Throws ModelError with `opIndex` (+`offset`) and `op` attached.
 */
export function applyOps(canonical, ops, { history = newHistory(), offset = 0 } = {}) {
	const ctx = { cols: structuredClone(canonical.collections), history };
	for (const [i, op] of ops.entries()) {
		try {
			applyOp(ctx, op);
		} catch (e) {
			if (e instanceof ModelError) {
				e.opIndex = offset + i;
				e.op = op;
				e.message = `op[${offset + i}] ${describeOp(op)}: ${e.message}`;
			}
			throw e;
		}
	}
	return { v: canonical.v ?? CANONICAL_VERSION, collections: ctx.cols };
}
