'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2, Maximize2, MessageSquarePlus, RotateCcw, X } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApplicationLink, isApplicationUrl } from '@/components/admin/application-link'
import { EmailLogDialog, ResendEmailDialog } from '@/components/admin/email-preview-dialog'
import { StatusMenuItems } from '@/components/admin/status-menu-items'
import { getEmailContent } from '@/lib/email/templates'
import { TRACKS } from '@/lib/content/tracks'
import { ADMIN_TRACK_IDS, STATUS_CONFIG } from '@/lib/types'
import type { AdminTrackId, Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import { ADMIN_TRACK_LABELS, decisionVariantLabel, formatDateTimeGMT7 } from '@/lib/applications/utils'

export interface ApplicationDetailsProps {
  application: Application
  notes: ReviewNote[]
  emailLogs: EmailLog[]
  onStatusSelect: (status: ApplicationStatus, decidedAfterInterview?: boolean) => void
  onAddNote: (input: { authorName: string; note: string }) => Promise<boolean>
  onUpdateTrack: (track: AdminTrackId) => Promise<void>
  onRetryEmail: (log: EmailLog, override?: EmailOverride) => Promise<void>
  onUpdateDates: (patch: { confirmedStartDate: string }) => Promise<void>
}

interface DetailsSheetProps extends ApplicationDetailsProps {
  onClose: () => void
  onReturnFocus?: () => void
}

/** Full submission + audit trail, kept out of the visible meta line. */
function metaDetail(application: Application): string {
  const parts = [`Applied ${formatDateTimeGMT7(application.created_at)} GMT+7`]
  if (application.status_changed_by) {
    const at = application.status_changed_at ? ` on ${formatDateTimeGMT7(application.status_changed_at)}` : ''
    parts.push(`Last changed by ${application.status_changed_by}${at}`)
  }
  return parts.join(' · ')
}

/** Reviewers sign every comment; remembering the name keeps that to one typing. */
const REVIEWER_NAME_KEY = '4seas-admin-reviewer-name'

/** Readable titles for email_type — the raw enum is a storage detail. */
const EMAIL_TYPE_LABELS: Record<EmailLog['email_type'], string> = {
  interview: 'Interview invitation',
  accepted: 'Acceptance',
  rejected: 'Rejection',
  movein_guide: 'Move-in guide',
}

const OUTCOME_BADGE_CLASS: Record<EmailLog['outcome'], string> = {
  sent: 'bg-[var(--admin-soft)] text-[var(--admin-accent)]',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  skipped: 'bg-[var(--admin-soft)] text-[var(--admin-faint)]',
}

/** The one status control for an application — pill trigger, flat status menu. */
function StatusControl({
  application,
  onSelect,
  menuContainer,
}: {
  application: Application
  onSelect: ApplicationDetailsProps['onStatusSelect']
  /** Set inside the Sheet so the menu portals into the dialog, not past it. */
  menuContainer?: HTMLElement | null
}) {
  // Terminal decisions carry their variant in the pill; legacy null rows read as the direct variant.
  const label =
    application.status === 'accepted' || application.status === 'rejected'
      ? `${STATUS_CONFIG[application.status].label} · ${decisionVariantLabel(application.status, application.decided_after_interview)}`
      : STATUS_CONFIG[application.status].label
  return (
    // Keep this menu non-modal so its email preview Dialog can open without a stale body pointer lock.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change status. Current status: ${label}`}
          className={`inline-flex h-9 max-w-[16rem] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold outline-none transition-shadow hover:ring-2 hover:ring-[var(--admin-accent)]/50 focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${STATUS_CONFIG[application.status].bgColor} ${STATUS_CONFIG[application.status].color}`}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" container={menuContainer} className="min-w-56">
        <StatusMenuItems application={application} onSelect={onSelect} exclude={[application.status]} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Title + meta line, shared by the Sheet and the full page so the two headers
 * cannot drift. The Sheet passes Radix's SheetTitle/SheetDescription (required
 * for dialog labelling); the page falls back to plain h1/p.
 */
export function ApplicationTitleBlock({
  application,
  toolbar,
  onStatusSelect,
  menuContainer,
  titleAs: Title = 'h1',
  descriptionAs: Description = 'p',
}: {
  application: Application
  /** Sheet-only chrome (close / open-as-page), on its own row above the title. */
  toolbar?: React.ReactNode
  onStatusSelect: ApplicationDetailsProps['onStatusSelect']
  /** Sheet-only: portal target for the status menu. */
  menuContainer?: HTMLElement | null
  titleAs?: React.ElementType
  descriptionAs?: React.ElementType
}) {
  return (
    <div className="px-5 pb-4 pt-3">
      {toolbar && <div className="-ml-2 mb-1 flex items-center gap-0.5">{toolbar}</div>}
      {/* Status rides in the sticky title row: the decision is made after reading
          the responses, so it must stay reachable without scrolling back up. */}
      <div className="flex items-start justify-between gap-3">
        <Title className="truncate text-xl font-semibold text-[var(--admin-text)]">{application.full_name}</Title>
        <StatusControl application={application} onSelect={onStatusSelect} menuContainer={menuContainer} />
      </div>
      {/* Only the submission date is identifying; track is an editable property
          below, and who-changed-what is audit detail. Both live in the tooltip. */}
      <Description title={metaDetail(application)} className="mt-1 text-sm text-[var(--admin-faint)]">
        Applied {formatDateTimeGMT7(application.created_at).slice(0, 10)}
      </Description>
    </div>
  )
}

/** One row of the property block: label left, value right. */
function Property({
  label,
  span,
  alignTop,
  children,
}: {
  label: string
  /** Full width instead of half — for values too long to sit two-per-row. */
  span?: boolean
  alignTop?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex min-w-0 items-start gap-3 py-1 ${span ? 'sm:col-span-2' : ''}`}>
      {/* Track link labels are full questions ("Your Social Media, Personal Website
          or Publications") — they identify the value, so they wrap rather than clip. */}
      <dt className="w-28 shrink-0 pt-1.5 text-xs leading-4 text-[var(--admin-faint)]">{label}</dt>
      <dd
        className={`flex min-h-7 min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1 text-sm text-[var(--admin-text)] ${
          alignTop ? 'items-start pt-1' : 'items-center'
        }`}
      >
        {children}
      </dd>
    </div>
  )
}

function DetailSection({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-[var(--admin-border)] px-5 py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--admin-faint)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// Ghost control: plain text at rest, affordance on hover/focus — same pattern as
// the dashboard table's InlineDateInput so both views read as one system.
const DATE_INPUT_CLASS =
  'w-[8.75rem] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm tabular-nums text-[var(--admin-text)] outline-none hover:border-[var(--admin-border)] focus:border-[var(--admin-accent)] [color-scheme:light] dark:[color-scheme:dark]'

const TRACK_TRIGGER_CLASS =
  'gap-1.5 rounded-md border-transparent bg-transparent px-1.5 text-sm text-[var(--admin-text)] shadow-none hover:border-[var(--admin-border)] focus-visible:border-[var(--admin-accent)] focus-visible:ring-0 data-[size=sm]:h-7 data-[state=open]:border-[var(--admin-border)] dark:bg-transparent dark:hover:bg-transparent'

export function ApplicationDetails({
  application,
  notes,
  emailLogs,
  onStatusSelect,
  onAddNote,
  onUpdateTrack,
  onRetryEmail,
  onUpdateDates,
}: ApplicationDetailsProps) {
  const [reviewerName, setReviewerName] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isUpdatingTrack, setIsUpdatingTrack] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [viewLog, setViewLog] = useState<EmailLog | null>(null)
  const [resendLog, setResendLog] = useState<EmailLog | null>(null)
  // Draft commits on blur; the date is always set, so empty/partial edits revert.
  const [confirmedDraft, setConfirmedDraft] = useState(application.confirmed_start_date)
  const track = application.track === 'other' ? null : TRACKS[application.track]
  const primaryLinkLabel = track?.apply.primaryLinkLabel ?? 'Primary link'
  const extraLinkLabel = track?.apply.extraLinkLabel ?? 'Additional link / information'
  const extraLinkIsText = Boolean(application.extra_link?.trim()) && !isApplicationUrl(application.extra_link)
  const contactLabel =
    application.contact_method === 'telegram'
      ? 'Telegram'
      : application.contact_method === 'whatsapp'
        ? 'WhatsApp'
        : 'Telegram / WhatsApp'
  const contactHref =
    application.contact_method === 'telegram'
      ? `https://t.me/${application.telegram_or_whatsapp.replace(/^@/, '')}`
      : application.contact_method === 'whatsapp'
        ? `https://wa.me/${application.telegram_or_whatsapp.replace(/\D/g, '')}`
        : null
  const responses: { question: string; answer: string | null }[] = [
    { question: 'About', answer: application.about },
    { question: 'How do you plan to contribute during your stay?', answer: application.contribution },
    { question: 'Tell us about a time you contributed to a community.', answer: application.past_contribution },
    {
      question: 'What commitment are you willing to make during your stay?',
      answer: application.participation_commitment,
    },
    ...(application.content_studio_plans
      ? [{ question: 'Content studio plans', answer: application.content_studio_plans }]
      : []),
  ]
  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notes],
  )

  useEffect(() => {
    setConfirmedDraft(application.confirmed_start_date)
  }, [application.confirmed_start_date])

  useEffect(() => {
    setReviewerName(window.localStorage.getItem(REVIEWER_NAME_KEY) ?? '')
  }, [])

  /**
   * Saves on change, not on blur. A blur-only commit is lost whenever the drawer
   * is dismissed while the field still has focus (Escape, overlay click) — the
   * focused node is removed and the browser fires no blur. `type="date"` only
   * reports complete dates, so every non-empty change here is a real edit.
   */
  const commitConfirmedDate = (next: string) => {
    setConfirmedDraft(next)
    if (!next || next === application.confirmed_start_date) return
    void onUpdateDates({ confirmedStartDate: next })
  }

  const handleAddNote = async () => {
    if (!reviewerName.trim() || !noteDraft.trim()) return
    setIsAddingNote(true)
    try {
      const added = await onAddNote({ authorName: reviewerName.trim(), note: noteDraft.trim() })
      if (added) {
        // The name is per-reviewer, not per-application: keep it and clear only the comment.
        window.localStorage.setItem(REVIEWER_NAME_KEY, reviewerName.trim())
        setNoteDraft('')
      }
    } finally {
      // The composer is inline and never unmounts, so a thrown action would leave
      // the reviewer's typed comment stranded in a permanently disabled field.
      setIsAddingNote(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <dl className="grid grid-cols-1 gap-x-8 border-b border-[var(--admin-border)] px-5 py-4 sm:grid-cols-2">
        <Property label="Track">
          <Select
            value={application.track}
            disabled={isUpdatingTrack}
            onValueChange={async (value) => {
              if (value === application.track) return
              setIsUpdatingTrack(true)
              try {
                await onUpdateTrack(value as AdminTrackId)
              } finally {
                setIsUpdatingTrack(false)
              }
            }}
          >
            <SelectTrigger size="sm" aria-label="Track" className={TRACK_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)]">
              {ADMIN_TRACK_IDS.map((trackId) => (
                <SelectItem key={trackId} value={trackId}>
                  {ADMIN_TRACK_LABELS[trackId]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Property>

        <Property label="Email">
          <a href={`mailto:${application.email}`} className="break-all text-[var(--admin-accent)] hover:underline">
            {application.email}
          </a>
        </Property>

        <Property label={contactLabel}>
          {contactHref ? (
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[var(--admin-accent)] hover:underline"
            >
              {application.telegram_or_whatsapp}
            </a>
          ) : (
            <span className="break-all">{application.telegram_or_whatsapp}</span>
          )}
        </Property>

        <Property label="Country/Region">{application.country}</Property>

        <Property label="Move-in date">
          <input
            type="date"
            value={confirmedDraft}
            aria-label="Move-in date"
            onChange={(event) => commitConfirmedDate(event.target.value)}
            // Clearing the field is not a delete — the date is never null.
            onBlur={() => !confirmedDraft && setConfirmedDraft(application.confirmed_start_date)}
            className={DATE_INPUT_CLASS}
          />
          {/* The applicant's preference stays visible, but only when it still differs. */}
          {application.preferred_start_date !== application.confirmed_start_date && (
            <span className="text-xs text-[var(--admin-faint)]">
              preferred {application.preferred_start_date}
            </span>
          )}
        </Property>

        <Property label={primaryLinkLabel}>
          <ApplicationLink url={application.primary_link} />
        </Property>

        <Property label="LinkedIn">
          <ApplicationLink url={application.linkedin} />
        </Property>

        {/* Free text (Longevity's Additional Information) needs the full width, uncut. */}
        <Property label={extraLinkLabel} span={extraLinkIsText} alignTop={extraLinkIsText}>
          <ApplicationLink url={application.extra_link} />
        </Property>
      </dl>

      <DetailSection title="Application responses">
        <div className="space-y-4">
          {responses.map((response) => (
            <div key={response.question} className="space-y-1">
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">{response.question}</h3>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--admin-text)]">
                {response.answer ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Email history">
        {emailLogs.length === 0 ? (
          <p className="text-sm text-[var(--admin-faint)]">No emails yet.</p>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {emailLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                {/* Row click opens the full email in a dialog. */}
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewLog(log)}>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[var(--admin-text)]">
                      {EMAIL_TYPE_LABELS[log.email_type]}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium capitalize ${OUTCOME_BADGE_CLASS[log.outcome]}`}
                    >
                      {log.outcome}
                    </span>
                  </p>
                  <p className="truncate text-xs text-[var(--admin-muted)]">
                    {log.subject || getEmailContent(log.email_type, application).subject}
                  </p>
                  <p className="text-xs text-[var(--admin-faint)]">
                    {formatDateTimeGMT7(log.created_at)} · by {log.triggered_by}
                  </p>
                  {log.error && <p className="mt-1 break-all text-xs text-red-600 dark:text-red-400">{log.error}</p>}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[var(--admin-border)] bg-transparent text-[var(--admin-text)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]"
                  disabled={retryingId === log.id}
                  onClick={() => setResendLog(log)}
                >
                  {retryingId === log.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="size-3.5" /> {log.outcome === 'sent' ? 'Resend' : 'Send'}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Review notes">
        {orderedNotes.length > 0 && (
          <div className="mb-4">
            {orderedNotes.map((note, index) => (
              <div key={note.id} className="relative pb-6 pl-7 last:pb-0">
                {index < orderedNotes.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-[5px] top-3 w-px bg-[var(--admin-border)]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 size-3 rounded-full border-2 border-[var(--admin-accent)] bg-[var(--admin-panel)]"
                />
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-[var(--admin-text)]">{note.author_name}</span>
                  <time className="text-xs text-[var(--admin-faint)]" dateTime={note.created_at}>
                    {formatDateTimeGMT7(note.created_at)} GMT+7
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--admin-text)]">
                  {note.note}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Inline composer — commenting is the point of this section, so it is
            always open. The name is remembered so it is typed once per browser. */}
        <div className="space-y-2">
          <Textarea
            aria-label="Review comment"
            disabled={isAddingNote}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void handleAddNote()
            }}
            placeholder="Add a review comment…"
            rows={noteDraft ? 4 : 2}
            className="resize-none border-[var(--admin-border)] bg-[var(--admin-ink)] text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:border-[var(--admin-accent)] focus-visible:ring-0"
          />
          <div className="flex items-center justify-end gap-2">
            <Input
              aria-label="Reviewer name"
              disabled={isAddingNote}
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Your name"
              className="h-8 w-36 border-[var(--admin-border)] bg-[var(--admin-ink)] text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:border-[var(--admin-accent)] focus-visible:ring-0"
            />
            <Button
              size="sm"
              disabled={isAddingNote || !reviewerName.trim() || !noteDraft.trim()}
              onClick={() => void handleAddNote()}
              className="h-8 bg-[var(--admin-accent)] text-[var(--admin-ink)] hover:bg-[var(--admin-accent-hover)]"
            >
              {isAddingNote ? <Loader2 className="size-4 animate-spin" /> : 'Comment'}
            </Button>
          </div>
        </div>
      </DetailSection>

      {viewLog && (
        <EmailLogDialog
          application={application}
          log={viewLog}
          onResend={() => {
            setResendLog(viewLog)
            setViewLog(null)
          }}
          onClose={() => setViewLog(null)}
        />
      )}

      {resendLog && (
        <ResendEmailDialog
          application={application}
          log={resendLog}
          isPending={retryingId === resendLog.id}
          onConfirm={async (override) => {
            setRetryingId(resendLog.id)
            await onRetryEmail(resendLog, override)
            setRetryingId(null)
            setResendLog(null)
          }}
          onCancel={() => setResendLog(null)}
        />
      )}
    </div>
  )
}

// Standard modal Sheet: Radix owns overlay/Escape dismissal, focus containment,
// and focus return. The expand icon opens /admin/applications/[id].
export function DetailsSheet({ onClose, onReturnFocus, ...props }: DetailsSheetProps) {
  const { application, onStatusSelect } = props
  // The status menu portals in here: parented to document.body it would sit
  // outside this dialog's dismissable layer and close on the click that opened it.
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={setContent}
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onReturnFocus?.()
        }}
        className="w-full gap-0 overflow-y-auto overscroll-contain border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] sm:max-w-2xl"
      >
        <SheetHeader className="sticky top-0 z-10 gap-0 border-b border-[var(--admin-border)] bg-[var(--admin-panel)]/95 p-0 backdrop-blur-xl">
          <ApplicationTitleBlock
            application={application}
            onStatusSelect={onStatusSelect}
            menuContainer={content}
            titleAs={SheetTitle}
            descriptionAs={SheetDescription}
            toolbar={
              <>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Close application details"
                    className="size-9 text-[var(--admin-faint)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)] focus-visible:ring-[var(--admin-accent)]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </SheetClose>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-9 text-[var(--admin-faint)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)] focus-visible:ring-[var(--admin-accent)]"
                >
                  <Link href={`/admin/applications/${application.id}`} title="Open as page" aria-label="Open as page">
                    <Maximize2 className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            }
          />
        </SheetHeader>
        {/* Keyed so note draft / expanded state reset when switching applicants */}
        <ApplicationDetails key={application.id} {...props} />
      </SheetContent>
    </Sheet>
  )
}
