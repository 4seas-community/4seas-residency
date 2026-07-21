-- Record admin-edited email content. body_text is non-null ONLY when the admin
-- edited the email in the preview dialog before sending/skipping; null means the
-- template was used verbatim (reproducible from the code at that commit).
-- Retry resends body_text when present, so edits survive a failed send.

alter table email_log add column body_text text;
