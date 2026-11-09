/**
 * Gate `/_dev/*` routes so they only render on the Astro DEV server.
 * In production (and preview builds), returns a rewrite to the site 404 page
 * with status 404 — reuse from every playground page (#13, #14, …).
 *
 * @example
 * ```astro
 * ---
 * import { gateDevOnly } from "../utils/dev-only";
 * const denied = await gateDevOnly(Astro);
 * if (denied) return denied;
 * ---
 * ```
 */
/** Minimal Astro surface so playground pages can share the gate without fighting AstroGlobal generics. */
type DevGateAstro = {
	response: { status?: number };
	rewrite: (path: string) => Promise<Response>;
};

export async function gateDevOnly(
	Astro: DevGateAstro,
): Promise<Response | undefined> {
	if (import.meta.env.DEV) return undefined;
	Astro.response.status = 404;
	return Astro.rewrite("/404");
}
