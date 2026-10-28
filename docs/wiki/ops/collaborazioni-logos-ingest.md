# Collaborazioni logos ingest

## Sources

- Zip from Chiara: `c:\Users\utente\Desktop\loghi_collaborazioni_flavia.zip` (2026-10-23)
- Extracted to `tmp/loghi-collaborazioni/` then copied to `seed/media/collaborazioni-logos/`

## Inventory (2026-10-23)

| File | Partner name |
|------|----------------|
| `logo_ciccolella.webp` | Ciccolella |
| `logo_evolio_expo.webp` | Evolio Expo |
| `logo_fioi.webp` | FIOI |
| `logo_gambero_rosso.webp` | Gambero Rosso |
| `logo_slow_food.webp` | Slow Food |
| `logo_tedx.webp` | TEDx |

Committed source of truth for reseed: `seed/media/collaborazioni-logos/` (6 webps).

## Seeded into DB (2026-10-23)

All six logos were ingested into the EmDash media library and linked on the `collaborations` / `collaborazioni` entry (names + image fields). Homepage and `/collaborazioni` resolve media via `/_emdash/api/media/file/…webp`, not Unsplash placeholders.

### Why not `$media` from local HTTP alone

EmDash seed `$media` fetches a downloadable HTTP `url`. Serving `seed/media/collaborazioni-logos` on a local port (e.g. `npx serve … -p 8765`) works for browsers, but the seeder **rejects non-public IPs** (`127.0.0.1` / loopback), so those URLs fail with “URLs targeting non-public IP addresses are not allowed”.

On 2026-10-23 the seed briefly used `http://127.0.0.1:8765/…` URLs. A later reseed left the entry with `provider: "external"` pointing at those loopback URLs, so the site rendered broken logos (issue [#3](https://github.com/bbtgnn/spaghettiabc-website/issues/3)).

### Fix (2026-10-28)

1. `seed/seed.json` `$media.url` values for the six logos point at public GitHub raw URLs under `main/seed/media/collaborazioni-logos/` (repo is public), so a normal seed can download them.
2. Local DB recovery: re-link the entry to the existing media library ids (files were already in `uploads/`) via `emdash content update` — do not rely on loopback `$media`.

### Reseed ritual (fresh DB or re-import logos)

1. Keep files in `seed/media/collaborazioni-logos/` (committed).
2. Prefer seeding from `seed/seed.json` (GitHub raw `$media` URLs):

   ```bash
   npx emdash seed seed/seed.json --on-conflict update
   ```

   (Do not use `--skip-media` if you need the webps downloaded.)

3. Alternative CLI ingest against a running local site:

   ```bash
   npx emdash media upload seed/media/collaborazioni-logos/logo_ciccolella.webp --alt "Logo Ciccolella" --url http://localhost:4321
   # …repeat for the other five files…
   # then content update collaborations collaborazioni with logos[] referencing the uploaded media ids
   ```

4. Local-only `serve` + `127.0.0.1` URLs alone are insufficient because of the SSRF/non-public-IP guard.
