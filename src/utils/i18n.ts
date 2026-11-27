/**
 * Locale helpers for #41. Prefer astro:i18n over EmDash internal localizePath.
 * Wave 2: content entry fallback requested → EN → IT (Astro routing fallback
 * cannot express the full chain; EmDash getFallbackChain follows Astro config
 * which only has it → en because defaultLocale cannot be a fallback key).
 */
import { getRelativeLocaleUrl } from "astro:i18n";
import { getEmDashEntry } from "emdash";
import {
	defaultLocale,
	locales,
	type Locale,
	type UiKey,
	ui,
} from "../i18n/ui";

const LOCALE_PREFIX = new RegExp(`^/(${locales.join("|")})(?=/|$)`, "i");

/** Decision content fallback order when a locale row is missing. */
export const CONTENT_FALLBACK_LOCALES: readonly Locale[] = ["en", "it"];

export function resolveLocale(raw: string | undefined | null): Locale {
	if (raw && (locales as readonly string[]).includes(raw)) {
		return raw as Locale;
	}
	return defaultLocale;
}

/**
 * Entry lookup chain: requested locale, then EN, then IT (deduped).
 * Complements EmDash/Astro `fallback: { it: "en" }` which cannot list
 * defaultLocale as a fallback key (so EN → IT is not automatic).
 */
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
 */
export async function getEmDashEntryWithFallback(
	collection: string,
	slug: string,
	options?: Parameters<typeof getEmDashEntry>[2],
) {
	const chain = contentLocaleChain(options?.locale);
	let last: Awaited<ReturnType<typeof getEmDashEntry>> | undefined;

	for (const loc of chain) {
		const result = await getEmDashEntry(collection, slug, {
			...options,
			locale: loc,
		});
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
 * Locale-prefixed path for site-relative hrefs.
 * External URLs, hashes, and already-prefixed paths are left alone (prefix swapped if needed).
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

	const withoutLocale = normalized.replace(LOCALE_PREFIX, "") || "/";
	const strip = withoutLocale === "/" ? "/" : withoutLocale.replace(/^\//, "");
	return getRelativeLocaleUrl(resolved, strip === "/" ? undefined : strip);
}

/** Swap `/en/...` ↔ `/it/...` on the current pathname (same path segments). */
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

/**
 * Public path segment after the locale prefix (e.g. `/en/tours/foo` → `tours/foo`).
 */
export function pathWithoutLocale(pathname: string): string {
	const stripped = pathname.replace(LOCALE_PREFIX, "") || "/";
	return stripped.replace(/^\//, "") || "";
}

/**
 * Strip leading locale folder segments from an EmDash entry id / slug.
 * With `src/pages/en|it/...`, some hydrated ids arrive as `en/polignano-food-tour`.
 */
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
