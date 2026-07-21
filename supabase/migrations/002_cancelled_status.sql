-- Add candidate-initiated terminal status `cancelled` (declined offer / cancelled
-- interview / no-show). Distinct from `rejected` (admin decision). No email is
-- mapped to it; the movein-guide cron only scans `accepted`, so cancelling an
-- accepted applicant automatically stops the send.

alter table applications drop constraint applications_status_check;
alter table applications add constraint applications_status_check
  check (status in ('submitted','reviewing','interview','accepted','rejected','cancelled'));
