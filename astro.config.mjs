import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import { formHeadingsPlugin } from "@spaghettiabc/form-headings";
import { layoutConsigliatoPlugin } from "@spaghettiabc/layout-consigliato";
import { d1, r2 } from "@emdash-cms/cloudflare";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

// Local `astro dev`: Node + SQLite + filesystem (so `$media.file` works).
// `astro build` / deploy: Cloudflare + D1 + R2.
const isProd = import.meta.env.PROD;
// Local-only overrides (ignored by prod builds): `schema:rehearse` boots a throwaway server on temp paths.
const localDatabaseUrl = process.env.EMDASH_DATABASE_URL || "file:./data.db";
const localUploadsDir = process.env.EMDASH_UPLOADS_DIR || "./uploads";

// Worktree PORT lives in `.env.local` (never read `.env` — secrets). An existing process.env.PORT wins.
try {
	process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
	output: "server",
	adapter: isProd ? cloudflare() : node({ mode: "standalone" }),
	i18n: {
		defaultLocale: "en",
		locales: ["en", "it"],
		// Default prefix-other-locales: EN unprefixed, IT under /it/...
		// Do not set prefixDefaultLocale — it 404s EmDash /_emdash/admin.
		// No Astro URL fallback: IT paths must stay on /it/... Content
		// fallback (requested → EN → IT) is getEmDashEntryWithFallback only.
	},
	server: {
		port: Number(process.env.PORT) || 4321,
		strictPort: true,
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: isProd
				? d1({ binding: "DB", session: "auto", coalesce: true })
				: sqlite({ url: localDatabaseUrl }),
			storage: isProd
				? r2({ binding: "MEDIA" })
				: local({
						directory: localUploadsDir,
						baseUrl: "/_emdash/api/media/file",
					}),
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
