'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2, Maximize2, RotateCcw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ApplicationLink } from '@/components/admin/application-link'
import { EmailLogDialog, ResendEmailDialog } from '@/components/admin/email-preview-dialog'
import { StatusMenuItems } from '@/components/admin/status-menu-items'
import { getEmailContent } from '@/lib/email/templates'
import { TRACKS } from '@/lib/content/tracks'
import { STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus, EmailLog, EmailOverride, ReviewNote } from '@/lib/types'
import { decisionVariantLabel, formatDateTimeGMT7 } from '@/lib/applications/utils'

export interface ApplicationDetailsProps {
  application: Application
  notes: ReviewNote[]
  emailLogs: EmailLog[]
  onStatusSelect: (status: ApplicationStatus, decidedAfterInterview?: boolean) => void
  onAddNote: (note: string) => Promise<boolean>
  onRetryEmail: (log: EmailLog, override?: EmailOverride) => Promise<void>
  onUpdateDates: (patch: { confirmedStartDate: string }) => Promise<void>
}

interface DetailsSheetProps extends ApplicationDetailsProps {
  onClose: () => void
}

/**
 * Title row shared by the drawer header and the full-page view: name, track,
 * and the status badge — which IS the status menu, same interaction as the
 * table's status cell.
 */
export function ApplicationTitleRow({
  application,
  onStatusSelect,
}: {
  application: Application
  onStatusSelect: ApplicationDetailsProps['onStatusSelect']
}) {
  // Terminal decisions carry their variant in the badge; legacy null rows read as the direct variant.
  const statusLabel =
    application.status === 'accepted' || application.status === 'rejected'
      ? `${STATUS_CONFIG[application.status].label} · ${decisionVariantLabel(application.status, application.decided_after_interview)}`
      : STATUS_CONFIG[application.status].label
  return (
    <>
      {application.full_name}
      <Badge className="border border-[var(--admin-border)] bg-transparent text-[var(--admin-muted)]">
        {TRACKS[application.track].shortName}
      </Badge>
      {/* modal={false}: a modal menu locks body pointer-events, and opening the
          email dialog from a menu item leaves that lock stuck (radix #1241). */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${STATUS_CONFIG[application.status].bgColor} ${STATUS_CONFIG[application.status].color}`}
          >
            {statusLabel}
            <ChevronDown className="size-3 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <StatusMenuItems application={application} onSelect={onStatusSelect} exclude={[application.status]} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

/** Applied / last-changed line under the title, shared by drawer and page. */
export function ApplicationMetaLine({ application }: { application: Application }) {
  return (
    <>
      Applied {formatDateTimeGMT7(application.created_at)} (GMT+7)
      {application.status_changed_by &&
        ` · Last changed by ${application.status_changed_by}${
          application.status_changed_at ? ` · ${formatDateTimeGMT7(application.status_changed_at)}` : ''
        }`}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-[var(--admin-faint)]">{label}</p>
      <div className="text-sm text-[var(--admin-text)]">{children}</div>
    </div>
  )
}

// Card level of the three-depth scheme: panel sheet → bordered card → ink inset.
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-faint)]">{title}</p>
      {children}
    </section>
  )
}

const DATE_INPUT_CLASS =
  'h-8 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-ink)] px-2 text-sm text-[var(--admin-text)] [color-scheme:light] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--admin-accent)] dark:[color-scheme:dark]'

export function ApplicationDetails({
  application,
  notes,
  emailLogs,
  onAddNote,
  onRetryEmail,
  onUpdateDates,
}: ApplicationDetailsProps) {
  const [noteDraft, setNoteDraft] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [viewLog, setViewLog] = useState<EmailLog | null>(null)
  const [resendLog, setResendLog] = useState<EmailLog | null>(null)
  // Draft commits on blur; the date is always set, so empty/partial edits revert.
  const [confirmedDraft, setConfirmedDraft] = useState(application.confirmed_start_date)
  const track = TRACKS[application.track]

  const commitConfirmedDate = () => {
    if (!confirmedDraft) {
      setConfirmedDraft(application.confirmed_start_date)
      return
    }
    if (confirmedDraft === application.confirmed_start_date) return
    void onUpdateDates({ confirmedStartDate: confirmedDraft })
  }

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return
    setIsAddingNote(true)
    const added = await onAddNote(noteDraft.trim())
    if (added) setNoteDraft('')
    setIsAddingNote(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-5 pb-8 pt-5">
      <SectionCard title="Applicant">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email">
            <a href={`mailto:${application.email}`} className="break-all text-[var(--admin-accent)] hover:underline">
              {application.email}
            </a>
          </Field>
          {application.contact_method === 'telegram' ? (
            <Field label="Telegram">
              <a
                href={`https://t.me/${application.telegram_or_whatsapp.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[var(--admin-accent)] hover:underline"
              >
                {application.telegram_or_whatsapp}
              </a>
            </Field>
          ) : application.contact_method === 'whatsapp' ? (
            <Field label="WhatsApp">
              <a
                href={`https://wa.me/${application.telegram_or_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[var(--admin-accent)] hover:underline"
              >
                {application.telegram_or_whatsapp}
              </a>
            </Field>
          ) : (
            <Field label="WhatsApp / Telegram">{application.telegram_or_whatsapp}</Field>
          )}
          <Field label="Country">{application.country}</Field>
          <Field label="Preferred start date">{application.preferred_start_date}</Field>
          <Field label="Confirmed move-in date">
            <input
              type="date"
              value={confirmedDraft}
              onChange={(event) => setConfirmedDraft(event.target.value)}
              onBlur={commitConfirmedDate}
              className={DATE_INPUT_CLASS}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Field label="Primary link">
            <ApplicationLink url={application.primary_link} />
          </Field>
          {application.linkedin && (
            <Field label="LinkedIn">
              <ApplicationLink url={application.linkedin} />
            </Field>
          )}
          {application.extra_link && (
            <Field label={track.apply.extraLinkLabel}>
              <ApplicationLink url={application.extra_link} />
            </Field>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Application">
        <Field label="About">
          <p className="whitespace-pre-wrap rounded-md bg-[var(--admin-ink)] p-3 leading-relaxed">{application.about}</p>
        </Field>
        <Field label="Planned contribution">
          <p className="whitespace-pre-wrap rounded-md bg-[var(--admin-ink)] p-3 leading-relaxed">{application.contribution}</p>
        </Field>
        {application.content_studio_plans && (
          <Field label="Content studio plans">
            <p className="whitespace-pre-wrap rounded-md bg-[var(--admin-ink)] p-3 leading-relaxed">{application.content_studio_plans}</p>
          </Field>
        )}
      </SectionCard>

      <SectionCard title="Email history">
        {emailLogs.length === 0 ? (
          <p className="text-sm text-[var(--admin-faint)]">No emails yet.</p>
        ) : (
          <div className="space-y-2">
            {emailLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-ink)] text-sm">
                <div className="flex items-start justify-between gap-3 p-3">
                  {/* Row click opens the full email in a dialog. */}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setViewLog(log)}>
                    <p className="font-medium text-[var(--admin-text)]">
                      {log.email_type}
                      <span
                        className={`ml-2 text-xs font-semibold ${
                          log.outcome === 'sent'
                            ? 'text-[var(--admin-accent)]'
                            : log.outcome === 'failed'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-[var(--admin-faint)]'
                        }`}
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
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Review notes">
        {notes.length === 0 && <p className="text-sm text-[var(--admin-faint)]">No notes yet.</p>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-ink)] p-4">
            <p className="mb-1 text-xs text-[var(--admin-faint)]">
              <span className="font-medium text-[var(--admin-text)]">{note.author_name}</span> ·{' '}
              {formatDateTimeGMT7(note.created_at)}
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--admin-text)]">{note.note}</p>
          </div>
        ))}
        <div className="space-y-2">
          <Textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a note for reviewers..."
            rows={3}
            className="border-[var(--admin-border)] bg-[var(--admin-ink)] text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:ring-[var(--admin-accent)]"
          />
          <Button size="sm" className="bg-[var(--admin-accent)] text-[var(--admin-ink)] hover:bg-[var(--admin-accent-hover)]" onClick={() => void handleAddNote()} disabled={isAddingNote || !noteDraft.trim()}>
            {isAddingNote ? <Loader2 className="size-4 animate-spin" /> : 'Add note'}
          </Button>
        </div>
      </SectionCard>

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

// Non-modal drawer: no backdrop, the list behind stays interactive so clicking
// another row switches the drawer content in place. Closes via X only —
// outside interaction is deliberately not a dismiss. The expand icon opens the
// application as a real page (/admin/applications/[id]).
export function DetailsSheet({ onClose, ...props }: DetailsSheetProps) {
  const { application, onStatusSelect } = props
  return (
    <Sheet open modal={false} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full overflow-y-auto overscroll-contain border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] sm:max-w-xl"
      >
        <SheetHeader className="border-b border-[var(--admin-border)] px-5 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2 pr-16 text-xl font-semibold text-[var(--admin-text)]">
            <ApplicationTitleRow application={application} onStatusSelect={onStatusSelect} />
          </SheetTitle>
          <SheetDescription className="text-[var(--admin-faint)]">
            <ApplicationMetaLine application={application} />
          </SheetDescription>
        </SheetHeader>
        <Link
          href={`/admin/applications/${application.id}`}
          title="Open as page"
          aria-label="Open as page"
          className="absolute top-4 right-12 rounded-xs p-1 text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        >
          <Maximize2 className="size-4" />
        </Link>
        {/* Keyed so note draft / expanded state reset when switching applicants */}
        <ApplicationDetails key={application.id} {...props} />
      </SheetContent>
    </Sheet>
  )
}
