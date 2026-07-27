# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

4Seas residency programs (crypto / art / longevity): marketing site + application funnel + admin review dashboard. Full product spec in `docs/PRD.md`, technical design in `docs/TECH-DESIGN.md` — read them before structural changes.

Stack: Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · shadcn/ui (`components/ui/`) · framer-motion · Supabase (Postgres only, no Auth) · Resend · Vercel. Package manager: pnpm.

Routes: `/` · `/residency/[track]` · `/residency/[track]/apply` · `/apply` (legacy redirect) · `/admin` + `/admin/login` · `/api/cron/movein-guide` (schedule in `vercel.json`, authenticated via `Authorization: Bearer $CRON_SECRET`).

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build (type errors DO fail the build)
pnpm typecheck      # tsc --noEmit — required before claiming work done
pnpm seed           # seed 20 fake applications (needs .env.local)
```

There are no automated tests by design; verification is manual per `docs/PRD.md` testing decisions. There is no linter — `pnpm typecheck` is the only gate.

## Architecture rules (load-bearing)

- **The browser never talks to Supabase.** The service-role client in `lib/db.ts` (`server-only`) is the single entry point, reached via server actions (`lib/actions/public.ts`, `lib/actions/admin.ts`), the cron route (`app/api/cron/movein-guide`), or `getDashboardData()` called directly by the `app/admin/page.tsx` Server Component. RLS is enabled with zero policies (default deny) — do not add policies or client-side Supabase.
- **Every admin server entry must call `requireAdmin()` first.** `middleware.ts` is UX-only, not a security boundary. Auth = shared `ADMIN_PASSWORD` + HMAC cookie (`lib/auth.ts`); there is no Supabase Auth.
- **All copy lives in `lib/content/`** (`tracks.ts` = per-track config incl. `state: open|coming_soon|closed`; `site.ts` = homepage/community links; `start-dates.ts` = 1st/15th options; `countries.ts` = country list). Components receive config slices as props — never hardcode per-track text in components.
- **Email preview = email send**: `lib/email/templates.ts` is a pure isomorphic module used by BOTH the admin preview dialog and `lib/email/send.ts`. Keep it free of secrets and `server-only` imports. `sendApplicationEmail` = render + send + log in one call; it never throws. Admin edits are plain text re-rendered through `renderCustomEmail` (same module, same guarantee); `email_log.body_text` is non-null for any edited email (sent or skipped), and Retry resends it. The `rejected` template has two variants keyed off `application.decided_after_interview` (after-interview rejections append a promo-code paragraph).
- **Status machine**: `submitted → reviewing → interview → accepted | rejected | cancelled` (6 statuses, `lib/types.ts`; `cancelled` = candidate-initiated exit at any stage, no email, distinct from admin-decided `rejected`). interview/accepted/rejected trigger the preview dialog; status update is decoupled from email outcome (email failure never rolls back status). `movein_guide` emails are cron-only, idempotent via `email_log`, and pick recipients by `confirmed_start_date ?? preferred_start_date`.
- **Decision/scheduling fields** (all admin-set, never emailed on change): `decided_after_interview` — chosen explicitly in the Accept/Reject variant submenu, defaults to after-interview iff the row is currently in `interview` status, null on non-terminal rows and legacy rows (rendered as the direct variant). Interview times are coordinated off-platform and not tracked; the legacy `interview_scheduled_at` DB column remains but is never read or written. `confirmed_start_date` — the working move-in date: written at submission (= `preferred_start_date`, migration 006 backfills legacy rows), admin-adjustable afterwards; `preferred_start_date` is never overwritten and remains visible in the drawer.
- **Apply funnel order is deliberate** (`lib/actions/public.ts`): zod → honeypot (`website` field returns fake success, stores nothing) → authoritative track-state check → rate limit (3/hour per `sha256(ip + IP_HASH_SALT)`; raw IP never stored) → insert. No applicant confirmation email by design — the success page is the confirmation.
- **Schema changes are manual SQL.** `supabase/migrations/*.sql` is run by hand in the Supabase SQL editor — no migration tooling. A schema change = new numbered SQL file + tell the user to run it.

## Conventions

- Every server action returns `ActionResult<T>` (`lib/types.ts`) — errors never throw across the client/server seam.
- Admin components style exclusively via `var(--admin-*)` CSS variables, never Tailwind semantic colors; status colors come from `STATUS_CONFIG`.
- All user-visible times are GMT+7 (Chiang Mai) — display via `formatDateTimeGMT7`, datetime inputs via the GMT+7 helpers in `lib/applications/utils.ts`.

## Env vars

All server-only except `NEXT_PUBLIC_SITE_URL` — see `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET` to the client.
