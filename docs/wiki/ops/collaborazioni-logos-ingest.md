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

`seed/seed.json` still lists the six logos with `http://127.0.0.1:8765/logo_….webp` filenames for documentation and for a future reseed if a **publicly reachable** URL is used. Those loopback URLs do not work on a fresh machine without the ritual below; they are not production asset URLs.

### Reseed ritual (fresh DB or re-import logos)

1. Keep files in `seed/media/collaborazioni-logos/` (committed).
2. Prefer CLI ingest (works against a running local site):

   ```bash
   npx emdash media upload seed/media/collaborazioni-logos/logo_ciccolella.webp --alt "Logo Ciccolella" --url http://localhost:4321
   # …repeat for the other five files…
   # then content update collaborations collaborazioni with logos[] referencing the uploaded media ids
   ```

3. Alternative: host the folder on a **public** HTTP URL (tunnel or remote), put those URLs in `seed/seed.json` `$media.url`, then:

   ```bash
   npx emdash seed seed/seed.json --on-conflict update
   ```

   (Do not use `--skip-media` if you need the webps downloaded.)

4. Local-only `serve` + `127.0.0.1` URLs alone are insufficient because of the SSRF/non-public-IP guard.
