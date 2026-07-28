-- Allow administrators to classify an application as Other. Public submission
-- validation remains limited to crypto, art, and longevity in application code.

alter table applications drop constraint applications_track_check;
alter table applications add constraint applications_track_check
  check (track in ('crypto', 'art', 'longevity', 'other'));
