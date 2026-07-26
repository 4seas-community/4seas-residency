-- Decision variants + scheduling fields (run by hand in the Supabase SQL editor).
-- decided_after_interview: set only when status is accepted/rejected (null otherwise;
--   legacy terminal rows stay null and are treated as "direct" decisions).
-- confirmed_start_date: admin-confirmed move-in date; never overwrites preferred_start_date.
-- interview_scheduled_at: interview time; sub-stages (needs scheduling / scheduled /
--   awaiting decision) are derived from this at read time, never stored.
alter table applications
  add column decided_after_interview boolean,
  add column confirmed_start_date date,
  add column interview_scheduled_at timestamptz;
