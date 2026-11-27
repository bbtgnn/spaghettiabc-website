/**
 * Locale helpers for #41. Prefer astro:i18n over EmDash internal localizePath.
 * Content entry fallback: requested → EN → IT (Astro routing cannot express the
 * full chain; EmDash getFallbackChain follows Astro config which only has
 * it → en because defaultLocale cannot be a fallback key).
 */
import { getRelativeLocaleUrl } from "astro:i18n";
import {
	getEmDashEntry,
	type EntryResult,
	type InferCollectionData,
	type SelectableReferences,
	type SelectedReferences,
} from "emdash";
import {
	defaultLocale,
	locales,
	type Locale,
	type UiKey,
	ui,
} from "./ui";

const LOCALE_PREFIX = new RegExp(`^/(${locales.join("|")})(?=/|$)`, "i");

/** Decision content fallback order when a locale row is missing. */
export const CONTENT_FALLBACK_LOCALES: readonly Locale[] = ["en", "it"];

export function resolveLocale(raw: string | undefined | null): Locale {
	if (raw && (locales as readonly string[]).includes(raw)) {
		return raw as Locale;
	}
	return defaultLocale;
}

export function contentLocaleChain(
	locale: string | undefined | null,
): Locale[] {
	const requested = resolveLocale(locale);
	const chain: Locale[] = [requested];
	for (const next of CONTENT_FALLBACK_LOCALES) {
		if (!chain.includes(next)) chain.push(next);
	}
	return chain;
}

/**
 * getEmDashEntry with decision fallback: requested → EN → IT.
 * EmDash already walks Astro's it→en chain for a single call; this helper
 * adds the EN→IT safety net and retries when a locale row is absent.
 *
 * Generics mirror getEmDashEntry so collection literals keep emdash-env.d.ts
 * field types (a plain `string` collection widens data to unknown).
 */
export async function getEmDashEntryWithFallback<
	T extends string,
	S extends SelectableReferences<T> = {},
>(
	collection: T,
	slug: string,
	options?: { locale?: string; references?: S },
): Promise<EntryResult<InferCollectionData<T>, SelectedReferences<T, S>>> {
	const chain = contentLocaleChain(options?.locale);
	let last:
		| EntryResult<InferCollectionData<T>, SelectedReferences<T, S>>
		| undefined;

	for (const loc of chain) {
		const result = await getEmDashEntry<T, InferCollectionData<T>, S>(
			collection,
			slug,
			{
				...options,
				locale: loc,
			},
		);
		last = result;
		if (result.entry) return result;
	}

	return (
		last ?? {
			entry: null,
			isPreview: false,
			cacheHint: { tags: [collection] },
		}
	);
}

export function t(
	locale: string | undefined | null,
	key: UiKey,
	vars?: Record<string, string | number>,
): string {
	const resolved = resolveLocale(locale);
	let text: string = ui[resolved][key] ?? ui[defaultLocale][key];
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replaceAll(`{${name}}`, String(value));
		}
	}
	return text;
}

/**
 * Locale-aware site-relative hrefs (EN unprefixed; IT under `/it/...`).
 * External URLs and bare hash/query are left alone; `/path#hash` keeps the hash.
 */
export function localePath(
	locale: string | undefined | null,
	path = "/",
): string {
	const resolved = resolveLocale(locale);

	if (path === "#") return path;
	if (/^(https?:|mailto:|tel:)/i.test(path)) return path;
	if (path.startsWith("#") || path.startsWith("?")) return path;

	const normalized =
		!path || path === "/"
			? "/"
			: path.startsWith("/")
				? path
				: `/${path}`;

	// Admin / EmDash internals stay unprefixed
	if (normalized.startsWith("/_emdash") || normalized.startsWith("/_astro")) {
		return normalized;
	}

	const hashIndex = normalized.indexOf("#");
	const queryIndex = normalized.indexOf("?");
	let cut = -1;
	if (hashIndex >= 0) cut = hashIndex;
	if (queryIndex >= 0 && (cut < 0 || queryIndex < cut)) cut = queryIndex;
	const suffix = cut >= 0 ? normalized.slice(cut) : "";
	const pathOnly = cut >= 0 ? normalized.slice(0, cut) || "/" : normalized;

	const withoutLocale = pathOnly.replace(LOCALE_PREFIX, "") || "/";
	const strip = withoutLocale === "/" ? "/" : withoutLocale.replace(/^\//, "");
	const base = getRelativeLocaleUrl(
		resolved,
		strip === "/" ? undefined : strip,
	);
	return `${base}${suffix}`;
}

export function swapLocalePrefix(
	pathname: string,
	targetLocale: string | undefined | null,
): string {
	const resolved = resolveLocale(targetLocale);
	const match = pathname.match(LOCALE_PREFIX);
	const rest = match ? pathname.slice(match[0].length) || "/" : pathname;
	const strip = rest === "/" ? undefined : rest.replace(/^\//, "");
	return getRelativeLocaleUrl(resolved, strip);
}

export function pathWithoutLocale(pathname: string): string {
	const stripped = pathname.replace(LOCALE_PREFIX, "") || "/";
	return stripped.replace(/^\//, "") || "";
}

export function entrySlug(raw: string | null | undefined): string {
	let s = (raw ?? "").replace(/^\/+/, "");
	const lead = new RegExp(`^(${locales.join("|")})/`, "i");
	while (lead.test(s)) {
		s = s.replace(lead, "");
	}
	return s;
}

/** Map EmDash collection → public path under a locale for the language switcher. */
export function contentPublicPath(
	collection: string,
	slug: string | null | undefined,
): string {
	const s = entrySlug(slug);
	switch (collection) {
		case "tours":
			return s ? `tours/${s}` : "tours";
		case "homepage":
			return "";
		case "libri":
			return s ? `books/${s}` : "";
		case "training":
			return "training";
		default:
			return s;
	}
}
