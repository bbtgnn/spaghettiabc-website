export type AdminLayoutList = {
	order: string[];
	hidden: string[];
};

export type AdminLayout = {
	version: 1;
	nav: AdminLayoutList;
	editor: AdminLayoutList;
};

/** Nav entries recommended for Spaghetti ABC editors (#37). */
export const RECOMMENDED_NAV_HIDDEN = [
	"/taxonomies/category",
	"/taxonomies/tag",
	"/content-types",
	"/byline-schema",
] as const;

/**
 * Always keep these visible when applying the recommended layout.
 * EmDash nav id for the Plugins manager is `/plugins-manager`.
 */
export const RECOMMENDED_NAV_ALWAYS_VISIBLE = ["/plugins-manager"] as const;

/** Editor sidebar sections recommended for Spaghetti ABC editors (#37). */
export const RECOMMENDED_EDITOR_HIDDEN = ["bylines", "taxonomies"] as const;

function emptyLayout(): AdminLayout {
	return {
		version: 1,
		nav: { order: [], hidden: [] },
		editor: { order: [], hidden: [] },
	};
}

function mergeUnique(existing: string[], additions: readonly string[]): string[] {
	const merged = [...existing];
	const seen = new Set(existing);
	for (const id of additions) {
		if (seen.has(id)) continue;
		seen.add(id);
		merged.push(id);
	}
	return merged;
}

function withoutIds(existing: string[], removals: readonly string[]): string[] {
	const drop = new Set(removals);
	return existing.filter((id) => !drop.has(id));
}

function includesAll(existing: string[], required: readonly string[]): boolean {
	const present = new Set(existing);
	return required.every((id) => present.has(id));
}

/** True when every recommended nav/editor hide is present on the layout. */
export function isRecommendedLayoutApplied(layout: AdminLayout | null): boolean {
	if (!layout) return false;
	return (
		includesAll(layout.nav.hidden, RECOMMENDED_NAV_HIDDEN) &&
		includesAll(layout.editor.hidden, RECOMMENDED_EDITOR_HIDDEN)
	);
}

/**
 * Merge recommended hides into an existing personal layout without wiping
 * order or other hidden IDs the user already chose.
 */
export function applyRecommendedLayout(layout: AdminLayout | null): AdminLayout {
	const base = layout ?? emptyLayout();
	return {
		version: 1,
		nav: {
			order: [...base.nav.order],
			hidden: withoutIds(
				mergeUnique(base.nav.hidden, RECOMMENDED_NAV_HIDDEN),
				RECOMMENDED_NAV_ALWAYS_VISIBLE,
			),
		},
		editor: {
			order: [...base.editor.order],
			hidden: mergeUnique(base.editor.hidden, RECOMMENDED_EDITOR_HIDDEN),
		},
	};
}

/**
 * Remove only the recommended hides, keeping order and any other personal hides.
 */
export function removeRecommendedLayout(layout: AdminLayout | null): AdminLayout {
	const base = layout ?? emptyLayout();
	return {
		version: 1,
		nav: {
			order: [...base.nav.order],
			hidden: withoutIds(base.nav.hidden, RECOMMENDED_NAV_HIDDEN),
		},
		editor: {
			order: [...base.editor.order],
			hidden: withoutIds(base.editor.hidden, RECOMMENDED_EDITOR_HIDDEN),
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdminLayout(value: unknown): AdminLayout | null {
	if (!isRecord(value)) return null;
	if (value.version !== 1) return null;
	if (!isRecord(value.nav) || !isRecord(value.editor)) return null;
	if (!Array.isArray(value.nav.order) || !Array.isArray(value.nav.hidden)) return null;
	if (!Array.isArray(value.editor.order) || !Array.isArray(value.editor.hidden)) return null;
	if (
		!value.nav.order.every((id) => typeof id === "string" && id.length > 0) ||
		!value.nav.hidden.every((id) => typeof id === "string" && id.length > 0) ||
		!value.editor.order.every((id) => typeof id === "string" && id.length > 0) ||
		!value.editor.hidden.every((id) => typeof id === "string" && id.length > 0)
	) {
		return null;
	}
	return {
		version: 1,
		nav: {
			order: value.nav.order as string[],
			hidden: value.nav.hidden as string[],
		},
		editor: {
			order: value.editor.order as string[],
			hidden: value.editor.hidden as string[],
		},
	};
}
