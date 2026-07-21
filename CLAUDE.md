# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

4Seas residency programs (crypto / art / longevity): marketing site + application funnel + admin review dashboard. Full product spec in `docs/PRD.md`, technical design in `docs/TECH-DESIGN.md` — read them before structural changes.

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build (type errors DO fail the build)
pnpm typecheck      # tsc --noEmit — required before claiming work done
pnpm seed           # seed 20 fake applications (needs .env.local)
```

There are no automated tests by design; verification is manual per `docs/PRD.md` testing decisions.

## Architecture rules (load-bearing)

- **The browser never talks to Supabase.** All data access goes through server actions (`lib/actions/public.ts`, `lib/actions/admin.ts`) or the cron route (`app/api/cron/movein-guide`), using the service-role key via `lib/db.ts` (`server-only`). RLS is enabled with zero policies (default deny) — do not add policies or client-side Supabase.
- **Every admin server entry must call `requireAdmin()` first.** `middleware.ts` is UX-only, not a security boundary. Auth = shared `ADMIN_PASSWORD` + HMAC cookie (`lib/auth.ts`); there is no Supabase Auth.
- **All copy lives in `lib/content/`** (`tracks.ts` = per-track config incl. `state: open|coming_soon|closed`; `site.ts` = homepage/community links; `start-dates.ts` = 1st/15th options). Components receive config slices as props — never hardcode per-track text in components.
- **Email preview = email send**: `lib/email/templates.ts` is a pure isomorphic module used by BOTH the admin preview dialog and `lib/email/send.ts`. Keep it free of secrets and `server-only` imports. `sendApplicationEmail` = render + send + log in one call; it never throws.
- **Status machine**: `submitted → reviewing → interview → accepted | rejected` (5 statuses, `lib/types.ts`). interview/accepted/rejected trigger the preview dialog; status update is decoupled from email outcome (email failure never rolls back status). `movein_guide` emails are cron-only, idempotent via `email_log`.

## Env vars

All server-only except `NEXT_PUBLIC_SITE_URL` — see `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET` to the client.
