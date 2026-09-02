# Cron & research worker setup

ExamStatus discovers new government exam notices from **allowlisted official domains only** (SSC, UPSC, IBPS, NTA, RRB, NCS). It does not scrape Google or Sarkari aggregator sites.

## Schedule (3–9 hours, random)

- Cloudflare Cron runs **every hour** (`0 * * * *`) via `wrangler.toml` `[triggers]`.
- Each hour, the worker `scheduled` handler POSTs to `/api/cron/research`.
- The research worker checks D1 `site_settings` key `research_next_run_at`. If not due, it **skips** (returns `skipped: true`).
- After a successful run, the next run is set to **now + random 3–9 hours**.

## Required secrets

Set in Cloudflare Dashboard → Workers → **examstatus** → Settings → Variables, or locally:

```bash
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put AI_CRON_SECRET
```

| Secret | Purpose |
|--------|---------|
| `ADMIN_SESSION_SECRET` | Signs admin session cookies |
| `AI_CRON_SECRET` | Authorizes `/api/cron/research` and `/api/cron/audit` |

Optional:

| Variable | Purpose |
|----------|---------|
| `PUBLIC_SITE_URL` | Base URL for scheduled self-fetch (default: workers.dev URL) |

### Local development

Copy examples and fill values (never commit real secrets):

```bash
cp .dev.vars.example .dev.vars
cp .env.example .env
```

Test cron endpoint locally (after `npm run build` + `wrangler dev`):

```bash
curl -X POST http://localhost:8787/api/cron/research \
  -H "x-cron-secret: YOUR_AI_CRON_SECRET"
```

Force a run (bypass 3–9h gate) from admin **AI Inbox → Force run now**, or:

```bash
curl -X POST http://localhost:8787/api/cron/research \
  -H "x-cron-secret: YOUR_AI_CRON_SECRET" \
  -H "x-force-research: 1"
```

## D1 migration: `source_crawl_log`

Apply on production D1:

```sql
CREATE TABLE IF NOT EXISTS source_crawl_log (
    url TEXT PRIMARY KEY,
    discovered_at TEXT NOT NULL,
    last_fetched_at TEXT NOT NULL,
    outcome TEXT
);
```

Or run `schema.sql` additions via Wrangler:

```bash
npx wrangler d1 execute examstatus-db --remote --file=schema.sql
```

## Manual Cloudflare dashboard steps

1. **Secrets** — set `ADMIN_SESSION_SECRET` and `AI_CRON_SECRET` if not using CLI.
2. **Cron trigger** — should deploy from `wrangler.toml` `[triggers] crons`. Verify under Workers → examstatus → Triggers.
3. **AI binding** — already in `wrangler.toml` under `[ai]`.
4. **Seed posts** — log in at `/admin`, run seed once so D1 has initial content.
5. **AI mode** — Theme Studio → `approve` (default) or `auto` for high-confidence auto-publish.

## Verify deployment

```bash
npm run build
npx wrangler secret list   # requires Cloudflare auth
```

Check admin **AI Inbox** for:
- Last run time
- Next scheduled run
- Pending drafts to approve

## Branch cleanup

If `feature/cursor-partial-build` still exists on GitHub:

```bash
git push origin --delete feature/cursor-partial-build
```

(Requires GitHub permissions.)
