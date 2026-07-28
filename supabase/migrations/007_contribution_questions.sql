-- Add the two new required Contribution responses. They remain nullable at the
-- database level so applications submitted before this migration stay valid.

alter table applications
  add column past_contribution text,
  add column participation_commitment text;
