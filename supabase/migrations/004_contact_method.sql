-- Record which messenger the applicant picked. Run by hand in the Supabase SQL editor.

alter table applications
  add column contact_method text check (contact_method in ('telegram', 'whatsapp'));

comment on column applications.contact_method is
  'Which messenger telegram_or_whatsapp refers to (telegram or whatsapp). Null means a legacy application submitted before this column existed.';

-- Backfill legacy rows where the format is unambiguous:
-- @handle => telegram, phone-number-looking value => whatsapp, anything else stays null.
update applications
set contact_method = case
  when telegram_or_whatsapp ~ '^\s*@' then 'telegram'
  when telegram_or_whatsapp ~ '^\s*\+?[0-9][0-9 ().-]*$' then 'whatsapp'
end
where contact_method is null;
