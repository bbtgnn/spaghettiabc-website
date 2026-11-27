# Deploy staging (Cloudflare Workers + GitHub Actions)

End-to-end setup from a **new Cloudflare account** to a working **repo deploy** on `main`. This site is EmDash on Astro: Worker + D1 (`DB`) + R2 (`MEDIA`) + SESSION KV.

Current staging Worker: `spaghettiabc-staging`  
Public URL shape: `https://spaghettiabc-staging.<subdomain>.workers.dev`

---

## What you need

- A Cloudflare account ([dash.cloudflare.com](https://dash.cloudflare.com))
- This repo cloned, Node **22+** (CI uses 22), npm
- `gh` CLI logged into GitHub (for secrets/vars), or use the GitHub UI
- Repo already contains: `wrangler.jsonc`, `src/worker.ts`, `.github/workflows/deploy.yml`

---

## Part A — Cloudflare account (one-time)

### 1. Create / open the account

1. Sign up or log in at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Free Workers is enough to start. Paid ($5/mo) helps later (more CPU, 30-day D1 Time Travel).

### 2. Enable R2

R2 is **not** on by default. Without this, deploy fails with “Please enable R2” / bucket not found.

1. Open [R2](https://dash.cloudflare.com/?to=/:account/r2).
2. Accept / enable R2 for the account.

### 3. Install deps and log Wrangler in

```bash
cd spaghettiabc-website
git checkout main && git pull
npm ci --legacy-peer-deps
npx wrangler login
```

Confirm the account:

```bash
npx wrangler whoami
```

Note the **Account ID** (32-char hex). You will put it in GitHub as `CLOUDFLARE_ACCOUNT_ID`.

### 4. Encryption key

```bash
cp .env.example .env
npx emdash secrets generate
# put the value in .env as EMDASH_ENCRYPTION_KEY=...
```

Store the same key in a password manager. You must upload it to the Worker next.

### 5. Create the R2 bucket (before or when deploy asks)

```bash
npx wrangler r2 bucket create spaghettiabc-staging-media
```

Name must match `wrangler.jsonc` → `r2_buckets[0].bucket_name`.

### 6. First deploy

```bash
npm run deploy
```

Wrangler / the Astro adapter will create or bind:

| Resource | Binding | Typical name |
|----------|---------|--------------|
| D1 | `DB` | `spaghettiabc-staging` |
| R2 | `MEDIA` | `spaghettiabc-staging-media` |
| KV | `SESSION` | `spaghettiabc-staging-session` |
| Images | `IMAGES` | (platform) |
| Durable Object | `EMDASH_ROOMS` | `EmDashRoom` |

**If SESSION KV already exists** (“namespace with this title already exists”):

```bash
npx wrangler kv namespace list
```

Put the existing id into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "SESSION", "id": "<kv-namespace-id>" }
]
```

**Pin the D1 id** after first create (also listed by `npx wrangler d1 list`):

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "spaghettiabc-staging",
    "database_id": "<d1-uuid>"
  }
]
```

Commit those ids once they are stable so CI and teammates use the same resources.

Successful deploy prints a URL like:

`https://spaghettiabc-staging.<subdomain>.workers.dev`

### 7. Put the encryption key on the Worker

```bash
npx wrangler secret put EMDASH_ENCRYPTION_KEY
# paste the same value as in .env
```

### 8. Finish EmDash setup (you first)

1. Open `https://spaghettiabc-staging.<subdomain>.workers.dev/_emdash/admin`
2. Complete the wizard. **You** must finish it first (first completer = admin).
3. For client content entry, choose **Sito vuoto** (empty site — schema from seed, no demo content).
4. Register a passkey on that hostname.
5. Settings → **Backups** → enable daily automatic backups (optional but recommended).

Schema comes from the seed bundled at build time (`seed/seed.json`). Locally, `npm run seed` upserts into **`./data.db`** (Node/SQLite) — stop `dev` first. It does **not** push to remote D1.

---

## Part B — GitHub Actions deploy (repo CI)

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

On `push` to `main` and `workflow_dispatch`:

`npm ci` → `build` → `emdash migrate` → `wrangler deploy` → `emdash migrate --check`

### 1. Create a Cloudflare API token

1. [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**.
2. Start from **Edit Cloudflare Workers**, or a custom token.

**Permissions that work for this repo:**

- Account → **Workers Scripts**: Edit  
- Account → **D1**: Edit  ← required for `emdash migrate` (easy to miss on the Workers template)  
- Account → **Workers R2 Storage**: Edit  
- Account → **Workers KV Storage**: Edit  
- Account → **Account Settings**: Read  

**Account resources:** Include → your account (e.g. “Bbt.gnn@gmail.com's Account” / Intero account).

**Zone resources:** If the UI says “Scegli una risorsa zona”, set **Include → All zones** (even with no custom domain). Staging uses `workers.dev`.

Copy the token **once**. Do not commit it or paste it into chat logs.

### 2. GitHub secret

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>
# paste token when prompted
```

Or: Repo → Settings → Secrets and variables → Actions → **New repository secret** → name `CLOUDFLARE_API_TOKEN`.

### 3. GitHub variables

| Variable | Where it comes from |
|----------|---------------------|
| `CLOUDFLARE_ACCOUNT_ID` | `npx wrangler whoami` |
| `D1_DATABASE_ID` | `npx wrangler d1 list` → UUID for `spaghettiabc-staging` |
| `EMDASH_TARGET_FINGERPRINT` | Short hash from migrate status (see below) — **not** the whole JSON |

```bash
gh variable set CLOUDFLARE_ACCOUNT_ID --body '<account-id>' --repo <owner>/<repo>
gh variable set D1_DATABASE_ID --body '<d1-uuid>' --repo <owner>/<repo>
```

### 4. Migration fingerprint

Wrangler OAuth login is **not** enough for `emdash migrate` against remote D1. Use the API token:

```bash
export CLOUDFLARE_API_TOKEN='…same token as the GitHub secret…'
npm run build
npx emdash migrate --status --json \
  --account-id "$CLOUDFLARE_ACCOUNT_ID" \
  --d1 "$D1_DATABASE_ID"
```

From the JSON, copy the **target fingerprint** field (a single hex/hash string).

```bash
gh variable set EMDASH_TARGET_FINGERPRINT --body '<fingerprint>' --repo <owner>/<repo>
```

Update this variable only after you intentionally change migration target (account/DB) and have re-checked `--status` locally.

### 5. Run CI once

```bash
gh workflow run Deploy --repo <owner>/<repo>
gh run watch --repo <owner>/<repo>
```

Or Actions → **Deploy** → **Run workflow**.

All steps should be green: build, inspect migrate, apply migrate, deploy, check migrate.

After that, every push to `main` deploys the same way.

---

## Part C — Day-to-day

| Task | Command / place |
|------|------------------|
| Local dev | `npm run dev` (Node + SQLite `./data.db` + `uploads/`; need `.env`) |
| Manual deploy | `npm run deploy` (after `wrangler login`) |
| CI deploy | push to `main` or workflow_dispatch |
| Admin (staging) | `https://spaghettiabc-staging.<subdomain>.workers.dev/_emdash/admin` |
| Pull content to local | `emdash site export` from staging → `site import` into an **empty** local content area |

### Content pull (staging → local)

```bash
npx emdash login --url https://spaghettiabc-staging.<subdomain>.workers.dev
npx emdash site export --url https://spaghettiabc-staging.<subdomain>.workers.dev --output staging.emdash
# Local must be empty of content (fresh setup), then:
npx emdash site import staging.emdash --url http://localhost:4321 --analyze
npx emdash site import staging.emdash --url http://localhost:4321 --plan sha256:<digest> --confirm
```

Treat `.emdash` packages like DB backups (they include emails). Users/passkeys are not in the package.

---

## Backups (short)

| What | Restorable? | Notes |
|------|-------------|--------|
| D1 Time Travel | Yes | Always on; 7d Free / 30d Paid |
| EmDash JSON in R2 `backups/` | No | Inspection only; needs Worker cron |
| R2 media files | Only if you sync elsewhere | No Cloudflare Time Travel for R2 |
| `EMDASH_ENCRYPTION_KEY` | N/A | Keep in secret manager; not in D1 dumps |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Please enable R2 / bucket not found | Enable R2 in dashboard; `wrangler r2 bucket create spaghettiabc-staging-media` |
| KV namespace title already exists | `wrangler kv namespace list` → set `SESSION` `id` in `wrangler.jsonc` |
| Zone resource required on API token | Include → **All zones** |
| `CLOUDFLARE_API_TOKEN is required for D1 migrations` | Export token in shell; OAuth login alone is not enough |
| CI migrate fingerprint mismatch | Re-run `--status`, update `EMDASH_TARGET_FINGERPRINT` |
| Install scripts warning (esbuild/workerd/fsevents) | Repo `package.json` → `allowScripts` (shared); re-approve pins after upgrades |

---

## Checklist

- [ ] Cloudflare account open  
- [ ] R2 enabled  
- [ ] `wrangler login` + `whoami`  
- [ ] `.env` with `EMDASH_ENCRYPTION_KEY`  
- [ ] R2 bucket `spaghettiabc-staging-media`  
- [ ] `npm run deploy` succeeds; D1 + SESSION ids pinned in `wrangler.jsonc`  
- [ ] `wrangler secret put EMDASH_ENCRYPTION_KEY`  
- [ ] Admin setup completed (empty site for client UAT)  
- [ ] GitHub secret `CLOUDFLARE_API_TOKEN` (includes **D1 Edit**)  
- [ ] GitHub vars `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`, `EMDASH_TARGET_FINGERPRINT`  
- [ ] Manual **Deploy** workflow green  
