# Secrets & cloud-build readiness

## Rules
- Never put API tokens, Access secrets, webhook URLs, or passwords in `src/`, commits, or docs.
- Local: use `.env` (Astro) and `.dev.vars` (Wrangler). Both are gitignored.
- Production: set secrets in Cloudflare Dashboard → Workers → examstatus → Settings → Variables, or `wrangler secret put NAME`.
- D1 `database_id` in `wrangler.toml` is a resource id (OK in git). Account API tokens are not.

## Before Cursor Cloud Agent builds
1. Confirm `git status` shows no `.env` / `.dev.vars`.
2. Grep the repo for accidental secrets.
3. Ensure Cloudflare build uses dashboard secrets, not committed files.

Cloud Agent / CI may deploy only after this audit passes.
