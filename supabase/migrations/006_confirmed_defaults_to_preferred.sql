-- confirmed_start_date is now written at submission time (= preferred_start_date)
-- and adjusted by admins afterwards. Backfill legacy rows that predate this.
update applications
set confirmed_start_date = preferred_start_date
where confirmed_start_date is null;
