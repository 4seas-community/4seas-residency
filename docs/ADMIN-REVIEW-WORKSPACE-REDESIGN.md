# Admin review workspace redesign

## Purpose

Make the application-review workspace faster to scan and act on without adding a new workflow concept. The page should guide an administrator toward the next application decision while retaining direct access to every valid status change.

## Confirmed design direction

- **Structure:** one compact workspace, with no persistent sidebar.
- **Primary organisation:** application status. The default queue is **Submitted**.
- **Track:** a filter and a compact tag in each row, never duplicate navigation.
- **Visual language:** inspired by Notion's information hierarchy, not its branding: neutral surfaces, fine dividers, limited corner radius, restrained shadows, and dense but legible rows.
- **Colour:** low-saturation status colours support scanning; status text always carries the meaning.
- **Theme:** light and dark themes share the same hierarchy and persist the administrator's preference.

## Page anatomy

1. A quiet top bar identifies the workspace and exposes the theme switch and sign-out action.
2. A horizontal status queue switches among Submitted, Reviewing, Interview, Accepted, Rejected, and Cancelled. Each label includes its current count.
3. Search, track filter, and sort controls refine the selected queue.
4. A compact shadcn-style application table presents applicant, track, preferred start date, and status. Selecting a row opens its detail panel.
5. The detail panel keeps the existing application data, notes, email preview, and resend history.

## Guidance and state changes

The interface gives one clear suggested action instead of displaying every possible action as a competing button.

| Current status | Primary action | Effect | Other status changes in More |
| --- | --- | --- | --- |
| Submitted | Start review | Moves to Reviewing | Any non-current status where needed |
| Reviewing | Invite to interview | Moves to Interview and opens the established email-preview flow | Accept, Reject, Mark as cancelled, or other permitted changes |
| Interview | Accept | Moves to Accepted and opens the established email-preview flow | Reject, Mark as cancelled, or other permitted changes |
| Accepted / Rejected / Cancelled | — | No suggested progression | Permitted direct changes remain available in More |

This preserves administrator discretion: a reviewer can accept, reject, or mark an application as cancelled before an interview. The primary action is a recommendation, not a restriction.

## Interaction rules

- Activating the primary action applies its status transition. Existing email-preview confirmation remains in control for Interview, Accepted, and Rejected notifications.
- **More actions** is a dropdown for exceptions and direct status changes; it avoids crowding the detail panel with several equal-weight buttons.
- Status changes are identified through label, position, and count; colour is secondary and never the sole signal.
- No SLA timers, unread markers, or separate “Needs attention” view are introduced in this phase.

## Non-goals

- No new review states, automations, deadlines, or assignment workflow.
- No permanent navigation by track.
- No change to application data, notification logic, review notes, or resend behavior.

## Acceptance criteria

- Submitted is the default state queue.
- Track can be filtered without becoming primary navigation.
- The list remains readable at high information density on desktop and collapses cleanly on smaller screens.
- Each active status has a visible count and a textual label.
- Reviewing exposes **Invite to interview** as its primary action, while direct Accept, Reject, and Cancelled actions remain available through **More actions**.
- Existing email preview, note, and resend flows continue to work.
- Type checking and production build pass.
