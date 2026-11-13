import type { AstroIntegration } from "astro";

/**
 * Registers `/_dev/*` playground routes.
 * Astro ignores `src/pages/_…` (underscore prefix), so these live under `src/dev/`
 * and are injected with the public `/_dev/…` URL pattern.
 */
export function devPlaygrounds(): AstroIntegration {
	return {
		name: "spaghettiabc-dev-playgrounds",
		hooks: {
			"astro:config:setup": ({ injectRoute }) => {
				injectRoute({
					pattern: "/_dev/sezione-tour",
					entrypoint: "./src/dev/sezione-tour/index.astro",
				});
				injectRoute({
					pattern: "/_dev/sezione-tour/[variant]",
					entrypoint: "./src/dev/sezione-tour/[variant].astro",
				});
			},
		},
	};
}
