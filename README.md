# 4Seas Residency

Marketing site + application funnel + admin review dashboard for the 4Seas residency programs (crypto / art / longevity) in Chiang Mai.

Product spec: `docs/PRD.md` · Technical design: `docs/TECH-DESIGN.md` · **New team members start here:** `docs/MAINTENANCE-AND-DEPLOYMENT.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · framer-motion · Supabase (Postgres only, no Auth) · Resend · Vercel.

**Architecture in one line:** the browser never touches the database — all reads/writes go through server actions using the Supabase service-role key; all three tables have RLS enabled with zero policies (default deny).

## Commands

```bash
corepack enable
pnpm install
pnpm dev            # dev server
pnpm build          # production build
pnpm typecheck      # tsc --noEmit (build does NOT skip type errors)
pnpm seed           # insert 20 fake applications (needs .env.local)
```

## Setup (external steps)

The application uses separate Supabase Preview and Production projects, separate Resend keys, and `residency.4seas.xyz` as its production domain. Follow the complete [deployment and maintenance guide](docs/MAINTENANCE-AND-DEPLOYMENT.md) instead of configuring the platforms from this short README.

For local development, copy `.env.example` to `.env.local` and request Preview-only values from the project maintainer. Never use Production secrets locally.

## How it works

- **Public**: `/` (home) · `/[track]` (track page; CTA driven by `state` in `lib/content/tracks.ts`) · `/[track]/apply` (form) · `/apply` (legacy redirect).
- **Apply flow**: every track shows the same Apply → Review → Decision expectations, then zod validation → honeypot (fake success) → rate limit (3/hour per hashed IP) → insert with status `submitted`. No confirmation email by design — the in-form success state is the confirmation.
- **Admin**: `/admin/login` (shared long password → HMAC-signed cookie) · `/admin` (list, filters, and a full application sheet containing responses, notes, email history, and status controls). Changing status to interview/accepted/rejected opens an email preview dialog (Update & send / Update without sending / Cancel). The email is **editable before sending** (subject + plain-text body, re-rendered through the same brand layout); edited sends are recorded in `email_log.body_text` and Retry resends the edited version. Status changes never roll back on email failure.
- **Status machine**: `submitted → reviewing → interview → accepted | rejected | cancelled`. `cancelled` = candidate-initiated exit (declined offer / cancelled interview) at any stage — no email. Distinct from admin-decided `rejected`.
- **Emails**: every send goes through the admin preview dialog on a status change — the system never mails anyone on its own. The `movein_guide` template is retained but currently has no trigger.
- **Content**: ALL copy lives in `lib/content/` (`tracks.ts`, `site.ts`, `start-dates.ts`). Components receive config as props — never hardcode per-track text in a component.

## Pending content (placeholders in code)

- Rejection email: replace placeholder wording with the community's existing template (`lib/email/templates.ts`).
- Coliving promo code value (`COLIVING_PROMO_CODE` in `lib/content/site.ts`).
- Move-in guide address/arrival details (`lib/email/templates.ts`).
