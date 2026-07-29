-- One-shot import of the v1 dataset, which lives in this same Supabase project.
-- v1 kept its data in `residency_applications` + `admin_comments`; both are left
-- untouched and serve as the archive. Row ids carry over, so re-running is a no-op.
--
-- Two generations of the v1 form are mixed in the source. The later one asked
-- bio / proposed_contribution / telegram / country separately; the earlier one only
-- had a combined about_and_contribution plus a free-text contact_info. Each coalesce
-- chain below takes the most specific answer available and falls back to the combined
-- one, so early rows end up with the same text in both `about` and `contribution`.
--
-- Fields v1 collected that v2 has no column for are preserved as one review note per
-- application rather than dropped. Everything else in the source table is empty across
-- all rows and carries nothing.

do $migration$
begin
  if to_regclass('public.residency_applications') is null then
    raise notice 'Skipping v1 import: public.residency_applications does not exist.';
    return;
  end if;

insert into applications (
  id, created_at, track, status,
  full_name, email, telegram_or_whatsapp, contact_method, country,
  preferred_start_date, confirmed_start_date,
  about, contribution, past_contribution, participation_commitment,
  primary_link, linkedin, extra_link, content_studio_plans,
  ip_hash, status_changed_at, status_changed_by
)
select
  a.id,
  a.created_at,
  coalesce(a.program_type, 'other'),
  -- No `else`: an unmapped status yields null and trips the NOT NULL check rather
  -- than silently importing as something wrong.
  case a.status
    when 'new'              then 'submitted'
    when 'pending'          then 'submitted'
    when 'reviewing'        then 'reviewing'
    when 'shortlisted'      then 'reviewing'
    when 'waitlist'         then 'reviewing'
    when 'interview_needed' then 'interview'
    when 'accepted'         then 'accepted'
    when 'approved'         then 'accepted'
    when 'rejected'         then 'rejected'
    when 'withdrawn'        then 'cancelled'
  end,
  a.full_name,
  a.email,
  coalesce(nullif(trim(a.telegram), ''), nullif(trim(a.whatsapp), ''), nullif(trim(a.contact_info), ''), ''),
  -- Explicit column wins; otherwise infer from the format, as migration 004 did.
  case
    when nullif(trim(a.telegram), '') is not null then 'telegram'
    when nullif(trim(a.whatsapp), '') is not null then 'whatsapp'
    when trim(a.contact_info) ~ '^\s*@' then 'telegram'
    when trim(a.contact_info) ~ '^\s*\+?[0-9][0-9 ().-]*$' then 'whatsapp'
  end,
  -- NOT NULL in v2; 17 rows have no location answer at all and land on ''.
  coalesce(
    nullif(trim(a.country), ''), nullif(trim(a.nationality), ''),
    nullif(trim(a.current_location), ''), nullif(trim(a.city), ''), ''
  ),
  -- v1 stored this as free text in two formats: '2026-09-15' and 'June 15, 2026'.
  a.preferred_start_date::date,
  coalesce(a.actual_start_date, a.preferred_start_date::date),
  coalesce(nullif(trim(a.bio), ''), nullif(trim(a.about_and_contribution), ''), ''),
  coalesce(nullif(trim(a.proposed_contribution), ''), nullif(trim(a.about_and_contribution), ''), ''),
  -- v1 never asked either of migration 007's two questions.
  nullif(trim(a.previous_community_experience), ''),
  null,
  coalesce(nullif(trim(a.social_links), ''), nullif(trim(a.website), ''), nullif(trim(a.portfolio_url), ''), ''),
  nullif(trim(a.linkedin_link), ''),
  coalesce(nullif(trim(a.github_link), ''), nullif(trim(a.portfolio_url), ''), nullif(trim(a.website), '')),
  nullif(trim(a.content_studio_plans), ''),
  -- Only used for rate limiting, which scans recent rows; imported rows share one bucket.
  'v1-migrated',
  a.reviewed_at,
  coalesce(nullif(trim(a.reviewed_by), ''), nullif(trim(a.assigned_admin), ''))
from residency_applications a
on conflict (id) do nothing;

-- v1's admin comments become review notes, keeping their ids and timestamps.
if to_regclass('public.admin_comments') is not null then
insert into review_notes (id, application_id, author_name, note, created_at)
select c.id, c.application_id, c.reviewer_name, c.comment, c.created_at
from admin_comments c
on conflict (id) do nothing;
else
  raise notice 'Skipping v1 admin comments: public.admin_comments does not exist.';
end if;

-- `needs_support` is the one answer v1 collected that v2 has no column for and that is
-- not already readable somewhere else, so it is the only thing carried over as a note.
-- The other candidates were all checked against the imported rows and dropped:
--   about_and_contribution — byte-identical to `bio`, already shown as About
--   nationality            — already what the country fallback picked up
--   admin_notes            — byte-identical to a row in admin_comments, imported above
--   preferred_duration     — the constant '1 month' on all 19 rows that set it
insert into review_notes (application_id, author_name, note, created_at)
select a.id, 'v1 migration', 'needs_support: ' || trim(a.needs_support), a.created_at
from residency_applications a
where nullif(trim(a.needs_support), '') is not null
  and not exists (
    select 1 from review_notes rn
    where rn.application_id = a.id and rn.author_name = 'v1 migration'
  );

-- One legacy contact was stored as a t.me link rather than an @handle, so the format
-- inference above missed it. The three values still unclassified are bare 7-8 character
-- strings that could belong to either messenger; they stay null rather than get a guess
-- that would render a broken deep link. The raw value is shown either way.
update applications
set contact_method = 'telegram'
where contact_method is null
  and ip_hash = 'v1-migrated'
  and telegram_or_whatsapp ~* 't\.me|telegram';
end
$migration$;
