# 4Seas Residency

Marketing site + application funnel + admin review dashboard for the 4Seas residency programs (crypto / art / longevity) in Chiang Mai.

Product spec: `docs/PRD.md` · Technical design: `docs/TECH-DESIGN.md` · Maintenance and deployment: `docs/MAINTENANCE-AND-DEPLOYMENT.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · framer-motion · Supabase (Postgres only, no Auth) · Resend · Vercel.

**Architecture in one line:** the browser never touches the database — all reads/writes go through server actions using the Supabase service-role key; all three tables have RLS enabled with zero policies (default deny).

## Commands

```bash
pnpm install
pnpm dev            # dev server
pnpm build          # production build
pnpm typecheck      # tsc --noEmit (build does NOT skip type errors)
pnpm seed           # insert 20 fake applications (needs .env.local)
```

## Setup (external steps)

1. **Supabase**: create a new project → run the files in `supabase/migrations/` **in order** (001 → 005) in the SQL editor. Copy the project URL and service-role key.
2. **Resend**: create an API key. For production, verify your sending domain and set `EMAIL_FROM` accordingly (e.g. `4Seas Residency <residency@mail.yourdomain.com>`).
3. **Secrets**: generate long random values for `ADMIN_PASSWORD`, `SESSION_SECRET`, `IP_HASH_SALT` (e.g. `openssl rand -base64 32`).
4. **Local**: copy `.env.example` → `.env.local` and fill it in.
5. **Vercel**: import the GitHub repo (Framework: Next.js, defaults are fine), add the same env vars for Production, and set `NEXT_PUBLIC_SITE_URL` to the deployed URL. Every push to `main` deploys Production; other branches get Preview URLs (Preview deployments share the same Supabase unless you point them at a separate project).

## How it works

- **Public**: `/` (home) · `/residency/[track]` (track page; CTA driven by `state` in `lib/content/tracks.ts`) · `/residency/[track]/apply` (form) · `/apply` (legacy redirect).
- **Apply flow**: every track shows the same Apply → Review → Decision expectations, then zod validation → honeypot (fake success) → rate limit (3/hour per hashed IP) → insert with status `submitted`. No confirmation email by design — the in-form success state is the confirmation.
- **Admin**: `/admin/login` (shared long password → HMAC-signed cookie) · `/admin` (list, filters, and a full application sheet containing responses, notes, email history, and status controls). Changing status to interview/accepted/rejected opens an email preview dialog (Update & send / Update without sending / Cancel). The email is **editable before sending** (subject + plain-text body, re-rendered through the same brand layout); edited sends are recorded in `email_log.body_text` and Retry resends the edited version. Status changes never roll back on email failure.
- **Status machine**: `submitted → reviewing → interview → accepted | rejected | cancelled`. `cancelled` = candidate-initiated exit (declined offer / cancelled interview) at any stage — no email. Distinct from admin-decided `rejected`.
- **Emails**: every send goes through the admin preview dialog on a status change — the system never mails anyone on its own. The `movein_guide` template is retained but currently has no trigger.
- **Content**: ALL copy lives in `lib/content/` (`tracks.ts`, `site.ts`, `start-dates.ts`). Components receive config as props — never hardcode per-track text in a component.

## Pending content (placeholders in code)

- Rejection email: replace placeholder wording with the community's existing template (`lib/email/templates.ts`).
- Coliving promo code value (`COLIVING_PROMO_CODE` in `lib/content/site.ts`).
- Move-in guide address/arrival details (`lib/email/templates.ts`).
