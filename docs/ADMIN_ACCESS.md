# Admin & Cloudflare Access

## Password bootstrap (first time)
1. Deploy with D1 bound.
2. Open `/admin/login`.
3. Enter your email + a strong password (10+ chars).
4. Click **Create first owner (once)**.

Set production secret:
```bash
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put AI_CRON_SECRET
```

## Cloudflare Access (recommended for hired staff)
1. Zero Trust → Access → Applications → Add self-hosted app.
2. Application domain: your Worker host; path protect `/admin*` and `/api/admin*`.
3. Policy: allow emails of teammates (or an Access group).
4. Add the same emails under Admin → Team with roles:
   - **owner** — theme, users, AI mode, publish
   - **editor** — create/edit/publish posts 
   - **researcher** — queue AI drafts; cannot publish (unless you change policy)
5. First Access user becomes owner automatically if `admin_users` is empty.

## Style guide (legal)
- Paraphrase summaries; do not paste competitor Sarkari Result wording.
- Official links must stay on allowlisted `.gov.in` / board domains.
- Never promise “guaranteed selection”.
