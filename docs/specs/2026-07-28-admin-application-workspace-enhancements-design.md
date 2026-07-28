# Admin application workspace and contribution form enhancements

- Date: 2026-07-28
- Status: Approved design
- Scope: Shared residency application form, application schema, and admin review workspace

## 1. Objective

Make application review faster to scan and operate while keeping the existing status machine, email flows, database access model, and shared application form architecture.

The change must:

1. Keep specific status counts visible in the top overview.
2. Add sorting and filtering controls for Track, Submitted, Move-in date, and Status.
3. Let administrators directly reclassify an application as Crypto, Art, Longevity, or Other.
4. Clarify applicant-preferred versus operational move-in dates without changing date behavior.
5. Capture a reviewer name with every note.
6. Make status changes prominent inside application details.
7. Display every application link field, including missing values.
8. Export all filtered and sorted application results to CSV.
9. Keep the public Crypto, Art, and Longevity application experiences aligned through the shared form.
10. Use the existing Sheet component with standard modal dismissal behavior.
11. Replace the single Contribution prompt with three required questions.

## 2. Non-goals

- No new application statuses or status-transition restrictions.
- No changes to email templates, send/skip behavior, resend behavior, or email logging.
- No changes to rate limiting, honeypot handling, Track availability checks, or authentication.
- No server-side filtering, pagination, or CSV endpoint.
- No generic form-schema or field-rendering framework.
- No change to About, Content Studio, or other application questions.
- No database renaming of `preferred_start_date` or `confirmed_start_date`.
- No public Other residency page or applicant-selectable Other Track.
- No preservation or audit history of the Track value that an administrator overwrites.

## 3. Overall approach

Extend the existing architecture surgically:

- Add only the two database fields needed for the additional Contribution answers.
- Extend the application Track database constraint with the admin-only `other` value without adding it to the public Track configuration.
- Reuse the existing `contribution` field for the first Contribution question.
- Reuse the existing date, link, note, status, Sheet, and email components and flows.
- Generate CSV in the browser from the already filtered and sorted application array.
- Keep all three Track application pages on the existing shared `ApplicationForm`.

## 4. Admin workspace design

### 4.1 Track and status overview

The existing top Track tabs remain and gain an Other tab for admin-classified applications.

The status overview keeps grouped cards, but child states are always visible inside their parent card rather than appearing in a separate row after selection:

- All
- New
  - Submitted
  - Reviewing
- Interview
- Accepted
  - Early
  - After interview
- Rejected
  - Before interview
  - After interview
- Cancelled

The parent count remains the sum of its children. Each child count is independently clickable as a filter. Text and count carry meaning; color is only a secondary cue.

Clicking a parent applies its existing grouped filter; clicking a child applies that exact child filter. In this overview only, `New` means the Submitted + Reviewing group.

### 4.2 Table filtering and sorting

The table retains the columns Applicant, Track, Submitted, Country/Region, Move-in date, and Status.

Controls:

| Column | Sort | Filter |
| --- | --- | --- |
| Applicant | Yes | Global search |
| Track | Yes | Yes, single-select |
| Submitted | Yes | No new filter |
| Country/Region | Yes | Existing multi-select |
| Move-in date | Yes | Existing date range |
| Status | Yes | Yes, single-select |

Track tabs and the Track column filter use the same state. Status cards and the Status column filter also use the same state. Selecting a value in either location updates the other; filters never stack as independent, potentially contradictory conditions.

The Track column menu offers All, Crypto, Art, Longevity, and Other. The Status column menu mirrors every selectable overview option, including the New group and the Accepted/Rejected decision-timing children, so any overview selection has one exact representation in the table header.

Sort order:

- Track: Crypto, Art, Longevity, Other.
- Status: Submitted, Reviewing, Interview, Accepted, Rejected, Cancelled.
- Accepted and Rejected decision timing does not alter the primary Status sort order.
- Clicking the active sort header toggles ascending and descending order.

The Status cell uses an obvious select-style dropdown with the current status text, status color, and chevron. It retains the established status update and email-preview behavior while making the edit affordance visible without hover.

> Amended 2026-07-28 (visual pass). The indicator dot was removed: the tinted fill, the text color, and the label already encode the status three times, and the dot inherited `bg-current` so it carried no information the text did not. `Country/Region` stays as written everywhere it is visible — the values include Hong Kong, Macau, and Taiwan, so shortening the label to `Country` would miscategorise them.

### 4.3 Admin Track reassignment

Track is editable through a labeled single-select control with Crypto, Art, Longevity, and Other in the table, Sheet, and full application page. Table interactions do not open the detail Sheet. The active control is disabled while its update is pending.

Selecting a Track immediately calls an authenticated admin action that validates the four admin Track values, overwrites `applications.track`, and returns the updated application. A successful update refreshes the current detail view, table row, Track counts, filters, and CSV source and shows a success toast. A failed update keeps the previous value and shows an error toast. When the active Track filter no longer includes the reassigned row, the row disappears as an immediate consequence of the saved filter.

Track reassignment does not change Status, decision timing, dates, notes, or email history and does not send an email. Future emails use the newly assigned Track. Other uses the templates' generic `4Seas Residency` fallback rather than a Track-specific program name.

Direct overwrite intentionally does not preserve the original applicant Track. After reassignment to another public Track, Track-specific link labels follow the new Track configuration. For Other, application details use the generic labels `Primary link`, `LinkedIn`, and `Additional link / information`.

### 4.4 Date presentation

The table contains one operational date column named `Move-in date`. It reads and edits `confirmed_start_date` and remains the field used for date sorting and filtering.

Application details show two fields:

- `Preferred move-in date`: read-only `preferred_start_date`, supplied by the applicant.
- `Move-in date`: editable `confirmed_start_date`, initially copied from the preference and adjustable by an administrator.

This is a UI terminology change only. Submission defaults and the move-in guide cron continue using the existing fields and behavior.

### 4.5 Prominent status control

Application details contain one prominent Status dropdown in the header. There is no second flattened status panel in the content area. The closed control shows the current status with a text label, semantic indicator dot, high-contrast border, and chevron, so the current state and edit affordance remain visible without hover.

The dropdown offers New, Reviewing, Interview, Accepted, Rejected, and Cancelled. In this per-application control, `New` maps only to the stored `submitted` status; it is not the Submitted + Reviewing overview group.

The control reuses the existing status update flow:

- New, Reviewing, and Cancelled update through the existing no-email path.
- Interview opens the existing email preview.
- Accepted and Rejected open the existing email preview, where the current decision toggle remains responsible for choosing Early/Before interview versus After interview.

The same prominent dropdown appears in the Sheet and the full application page because both views share the header controls.

> Amended 2026-07-28 (visual pass). The closed control is a pill — status fill, status text, chevron — with no indicator dot and no high-contrast border; it rides in the sticky title row, so the decision stays reachable after scrolling through the responses. Track moved out of the header into the property block as a control that reads as plain text until hovered or focused, matching the table's inline date field.

### 4.6 Detail Sheet behavior

Continue using the existing shadcn Sheet backed by Radix Dialog. Restore its standard modal behavior:

- Opening a row presents a right-side Sheet and a lightly dimmed overlay over the list.
- Clicking the overlay closes the Sheet only; it does not activate the underlying row.
- Escape closes the Sheet.
- Focus is contained while open and returns to the invoking row on close.
- A visible close button remains keyboard accessible.

The Sheet header begins with two at-least-36-by-36-pixel buttons:

1. Close.
2. Open the application as a full page.

The applicant title follows these controls. The header is sticky while the detail content scrolls and contains the only Status control plus the Track selector. The content order is Review notes, Contact & stay, Links, Application responses, and Email history.

> Amended 2026-07-28 (visual pass). The two buttons keep their 36×36 hit area but sit on their own toolbar row above the title, so the title starts at the left margin instead of being pushed right. The meta line under the title carries only `Applied <date>`; the full timestamp and the last-changed audit trail moved into its tooltip. Contact & stay and Links merged into one property block directly under the header — label left, value right, two properties per row where the values are short. The section order is now Application responses, Email history, then Review notes: reviewing means reading first and commenting last, so the composer sits where that thought ends. Review notes end in an always-open composer (comment field, reviewer name, submit) instead of an `Add comment` button and modal Dialog; the reviewer name persists in `localStorage` so it is typed once per browser. Application responses render as question + paragraph rather than filled boxes. The implementation should use the existing `Sheet`, `SheetContent`, `SheetClose`, and overlay primitives rather than introduce another drawer library.

### 4.7 Link display

All three link-related fields always appear in application details, using the label and order from the relevant Track application page:

1. Track-specific primary link label.
2. LinkedIn.
3. Track-specific extra field label.

Display rules:

- A valid URL renders as a compact chip with its detected platform icon, readable platform label, and external-link affordance.
- A missing value renders as a muted chip with `—`.
- A non-URL value, permitted by Longevity's `Additional Information`, renders as a complete labeled text block below the URL chips rather than being truncated into a chip.
- Hovering or focusing a URL chip exposes the full submitted URL through its accessible title/label.

The public form validation remains unchanged: the primary link is required; LinkedIn and the Track-specific extra field are optional.

### 4.8 Review notes

Review notes are the last content section, below Email history (amended 2026-07-28; originally first, immediately below the sticky header). They render as a vertical timeline ordered newest first. Each timeline entry shows the reviewer name, GMT+7 creation time, and complete comment text without a separate bubble or card container.

> Amended 2026-07-28 (visual pass). The modal Dialog below was replaced by an always-open inline composer at the end of the timeline. Both fields remain required and `addNote` is unchanged; only the presentation differs. Cmd/Ctrl+Enter submits, and a successful insert clears the comment but keeps the reviewer name.

The detail page contains an `Add comment` button rather than inline inputs. It opens a modal Dialog containing two required fields:

- Reviewer name.
- Comment.

`addNote` receives and validates both values, then stores the submitted reviewer name and comment in the existing `review_notes.author_name` and `review_notes.note` columns. The database table and action name remain unchanged.

After a successful insert, the Dialog closes, both inputs clear, and the new comment is prepended to the timeline. On failure, the Dialog stays open and both values remain so the reviewer can retry. Cancel, Escape, and overlay click close the Dialog without submitting.

## 5. Shared application form and database design

### 5.1 Contribution questions

Replace the current single Contribution prompt on Crypto, Art, and Longevity application pages with the following shared required questions and copy.

#### Question 1

**How do you plan to contribute during your stay?**

Please describe one or two concrete ways you hope to contribute to the 4Seas community during your residency. This could include sharing knowledge, leading a session, helping with operations, creating content, supporting research, cooking, building projects, or anything else that creates value for others.

Placeholder: `Describe your planned contribution...`

#### Question 2

**Tell us about a time you contributed to a community.**

Briefly describe a project, community, or team where you actively contributed. What did you do, and what was the impact?

Placeholder: `Share a past contribution experience...`

#### Question 3

**What commitment are you willing to make during your stay?**

4Seas is a community built by people who both learn and contribute. What level of participation can we realistically expect from you during your residency?

Placeholder: `Describe your expected level of participation...`

Each question:

- Is required for new submissions.
- Has its own textarea and `current/300 words` counter.
- Rejects more than 300 whitespace-delimited words in the browser and in the authoritative server action.
- Displays its own validation error.

### 5.2 Storage and legacy compatibility

Create `supabase/migrations/007_contribution_questions.sql` with two nullable text columns:

- `past_contribution`
- `participation_commitment`

Field mapping:

| Question | Client field | Database field |
| --- | --- | --- |
| Planned contribution | `contribution` | existing `contribution` |
| Past community contribution | `pastContribution` | new `past_contribution` |
| Participation commitment | `participationCommitment` | new `participation_commitment` |

The new columns remain nullable at the database level so legacy rows stay valid. The server action requires all three fields for new submissions.

Existing applications keep their original response as Question 1. Questions 2 and 3 display as `—` in the admin UI and as empty cells in CSV.

The manual deployment sequence is:

1. Run migration 007 in the Supabase SQL editor.
2. Run migration 008 in the Supabase SQL editor.
3. Deploy the application code that selects and writes the new columns and supports the admin-only Other Track.

### 5.3 Link and date fields

No link columns or public link validation change. The form continues to require `primaryLink`; `linkedin` and `extraLink` remain optional.

No date columns or write behavior change. `preferred_start_date` remains the applicant preference. `confirmed_start_date` remains the operational Move-in date and continues defaulting to the preference at submission.

### 5.4 Admin-only Other Track

Create `supabase/migrations/008_admin_other_track.sql` after migration 007. It replaces the existing `applications_track_check` constraint so stored Track values may be `crypto`, `art`, `longevity`, or `other`.

Keep the public `TrackId`, `TRACK_IDS`, and `TRACKS` content configuration limited to Crypto, Art, and Longevity so public routes and submission validation cannot accept Other. Introduce a separate admin/data type equivalent to `TrackId | 'other'` for stored applications, admin filtering, sorting, reassignment, and CSV export.

The authenticated Track update action accepts only the four stored application Track values. No unauthenticated or public action may submit or update `other`.

## 6. CSV export design

Place an `Export filtered CSV` action in the list toolbar. It is disabled when the filtered result is empty.

The export source is the fully filtered and sorted application array before pagination. It respects global search, Track, Status, Country/Region, Move-in range, and current sort direction.

CSV columns, in order:

1. Track, including the admin-only Other value
2. Status
3. Status detail
4. Submitted at (GMT+7)
5. Name
6. Email
7. Contact method
8. Contact
9. Country/Region
10. Preferred move-in date
11. Move-in date
12. About
13. Contribution - planned
14. Contribution - past community
15. Contribution - commitment
16. Primary link
17. LinkedIn
18. Track-specific link / additional information
19. Content studio plans

`Status detail` is empty for non-terminal states. Accepted exports `Early` or `After interview`; Rejected exports `Before interview` or `After interview`.

The file name is `4seas-applications-YYYY-MM-DD.csv` using the current GMT+7 date.

CSV serialization must:

- Add a UTF-8 BOM for spreadsheet compatibility.
- Quote and escape commas, double quotes, carriage returns, and line feeds correctly.
- Neutralize cells beginning with `=`, `+`, `-`, or `@` so applicant-controlled content cannot execute as a spreadsheet formula.
- Revoke the generated object URL after triggering the download.
- Use empty cells for missing data rather than the UI-only `—` marker.

The export excludes `ip_hash`, review notes, and email logs.

## 7. Error handling

- Contribution validation identifies the first invalid question and also leaves per-field errors visible.
- The server action remains authoritative and inserts no partial application on validation failure.
- A failed note insert keeps the reviewer name and note draft intact and shows the existing toast error path.
- A failed Track reassignment retains the previous Track in local state and shows a non-destructive error toast.
- Status, date, and email failures keep their current toast and rollback behavior.
- CSV export has no network dependency. If browser file generation fails, show a non-destructive error toast and leave the current filters unchanged.

## 8. Verification and acceptance criteria

### Application form

- All three Track apply pages show the same three required Contribution questions.
- Each question independently accepts 300 words and rejects 301 words.
- Empty answers are rejected in the browser and by the server action.
- A successful submission stores all three answers in their defined columns.
- Rate limiting, honeypot, Track-state, date, and existing field validation still behave as before.
- Public submission rejects `other`, and no public application page or selector exposes it.

### Legacy applications

- An application created before migration 007 opens successfully.
- Its original Contribution response appears under Question 1.
- Questions 2 and 3 render as `—` in the admin UI and empty in CSV.
- Migration 008 preserves every existing Crypto, Art, and Longevity Track value.

### Admin list

- New, Accepted, and Rejected cards always show their child status counts.
- Top and column Track filters remain synchronized.
- Top and column Status filters remain synchronized.
- Track, Submitted, Move-in date, and Status sort correctly in both directions.
- Other appears in Track tabs, the Track header filter, counts, sorting, search results, and CSV export.
- Track can be changed directly from a table-row dropdown without opening the detail Sheet.
- Status uses a visible select-style dropdown in every table row while retaining the established email-preview rules.
- Combined search, filtering, sorting, and pagination produce consistent counts and rows.
- The list exposes only one editable `Move-in date` column.

### Application details

- The Sheet closes on overlay click and Escape without activating an underlying row.
- Focus returns to the invoking row.
- Close and full-page controls appear at the left of the Sheet header.
- The Sheet and full page show the same prominent header Status dropdown and application data, with no duplicate status panel in the content.
- Review notes are the first content section below the header.
- The Track selector appears in both views and can change an application among Crypto, Art, Longevity, and Other.
- Reassigning Track updates the list and counts without changing Status or sending email.
- Other uses generic link labels and generic Residency wording in future emails.
- Status changes continue through the established email preview and decision-variant flow.
- Review comments render newest first as a vertical timeline.
- `Add comment` opens a Dialog where Reviewer name and Comment are both required.
- A successful comment closes the Dialog, clears both fields, and prepends the new timeline entry; a failure retains both drafts.
- All three link fields render; empty values show `—`; non-URL Additional Information remains fully readable.

### CSV

- Export includes every filtered result, not only the current page.
- Row order matches the current table sort.
- Unicode, commas, quotes, newlines, and formula-like input serialize safely.
- `ip_hash`, review notes, and email logs are absent.
- Export is disabled for an empty result.

### Regression gates

- Interview, Accepted, and Rejected preview, edit, send, and skip paths still work.
- Move-in guide scheduling continues using `confirmed_start_date`.
- Public Track pages and content remain limited to Crypto, Art, and Longevity.
- Light theme, dark theme, narrow-screen table scrolling, Sheet, and full application page remain usable.
- `pnpm typecheck` passes.
- `pnpm build` passes.
