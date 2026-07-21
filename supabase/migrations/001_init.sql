-- 4Seas Residency v2 — initial schema.
-- All access goes through the server with the service-role key.
-- RLS is enabled with NO policies: anon/authenticated are denied everything.

create table applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  track text not null check (track in ('crypto','art','longevity')),
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','interview','accepted','rejected')),
  full_name text not null,
  email text not null,
  telegram_or_whatsapp text not null,
  country text not null,
  preferred_start_date date not null,
  about text not null,
  contribution text not null,
  primary_link text not null,
  linkedin text,
  extra_link text,
  content_studio_plans text,
  ip_hash text not null,
  status_changed_at timestamptz,
  status_changed_by text
);

create index applications_rate_limit_idx on applications (ip_hash, created_at);
create index applications_cron_idx on applications (status, preferred_start_date);

create table review_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_name text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index review_notes_application_idx on review_notes (application_id);

create table email_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  email_type text not null check (email_type in ('interview','accepted','rejected','movein_guide')),
  recipient text not null,
  subject text not null,
  outcome text not null check (outcome in ('sent','failed','skipped')),
  resend_id text,
  error text,
  triggered_by text not null,
  created_at timestamptz not null default now()
);

create index email_log_application_idx on email_log (application_id);

alter table applications enable row level security;
alter table review_notes enable row level security;
alter table email_log enable row level security;
-- Intentionally no policies: default deny for anon and authenticated roles.
