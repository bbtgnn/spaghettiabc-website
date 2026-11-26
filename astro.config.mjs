import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { formHeadingsPlugin } from "@spaghettiabc/form-headings";
import { layoutConsigliatoPlugin } from "@spaghettiabc/layout-consigliato";
import { d1, r2 } from "@emdash-cms/cloudflare";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	i18n: {
		defaultLocale: "en",
		locales: ["en", "it"],
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: true,
		},
		// No Astro URL fallback: IT paths must stay on /it/... Content
		// fallback (requested → EN → IT) is getEmDashEntryWithFallback only.
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [formHeadingsPlugin(), layoutConsigliatoPlugin()],
			admin: {
				// Keep Menus + Redirects; hide unused built-in admin areas (#31).
				hiddenNavItems: [
					"calendar",
					"media",
					"comments",
					"widgets",
					"sections",
					"bylines",
					"import",
				],
			},
		}),
	],
	devToolbar: { enabled: false },
});
