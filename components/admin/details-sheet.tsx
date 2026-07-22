'use client'

import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApplicationLink } from '@/components/admin/application-link'
import { TRACKS } from '@/lib/content/tracks'
import { STATUS_CONFIG, ALL_STATUSES } from '@/lib/types'
import type { Application, ApplicationStatus, EmailLog, ReviewNote } from '@/lib/types'
import { formatDateTimeGMT7 } from '@/lib/applications/utils'

interface DetailsSheetProps {
  application: Application
  notes: ReviewNote[]
  emailLogs: EmailLog[]
  onClose: () => void
  onStatusSelect: (status: ApplicationStatus) => void
  onAddNote: (note: string) => Promise<boolean>
  onRetryEmail: (log: EmailLog) => Promise<void>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export function DetailsSheet({
  application,
  notes,
  emailLogs,
  onClose,
  onStatusSelect,
  onAddNote,
  onRetryEmail,
}: DetailsSheetProps) {
  const [noteDraft, setNoteDraft] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const track = TRACKS[application.track]

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return
    setIsAddingNote(true)
    const added = await onAddNote(noteDraft.trim())
    if (added) setNoteDraft('')
    setIsAddingNote(false)
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 flex-wrap">
            {application.full_name}
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: track.accentColor }}
            >
              {track.shortName}
            </span>
            <Badge
              className={`${STATUS_CONFIG[application.status].bgColor} ${STATUS_CONFIG[application.status].color} border-0`}
            >
              {STATUS_CONFIG[application.status].label}
            </Badge>
          </SheetTitle>
          <SheetDescription>Applied {formatDateTimeGMT7(application.created_at)} (GMT+7)</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <Select value={application.status} onValueChange={(value) => onStatusSelect(value as ApplicationStatus)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {application.status_changed_by && (
              <p className="text-xs text-muted-foreground">
                Last changed by {application.status_changed_by}
                {application.status_changed_at && ` · ${formatDateTimeGMT7(application.status_changed_at)}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email">
              <a href={`mailto:${application.email}`} className="break-all text-primary hover:underline">
                {application.email}
              </a>
            </Field>
            <Field label="WhatsApp / Telegram">{application.telegram_or_whatsapp}</Field>
            <Field label="Country">{application.country}</Field>
            <Field label="Preferred start date">{application.preferred_start_date}</Field>
          </div>

          <Field label="About">
            <p className="whitespace-pre-wrap leading-relaxed">{application.about}</p>
          </Field>
          <Field label="Planned contribution">
            <p className="whitespace-pre-wrap leading-relaxed">{application.contribution}</p>
          </Field>
          {application.content_studio_plans && (
            <Field label="Content studio plans">
              <p className="whitespace-pre-wrap leading-relaxed">{application.content_studio_plans}</p>
            </Field>
          )}

          <div className="space-y-3">
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email history</p>
            {emailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails yet.</p>
            ) : (
              <div className="space-y-2">
                {emailLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {log.email_type}
                        <span
                          className={`ml-2 text-xs font-semibold ${
                            log.outcome === 'sent'
                              ? 'text-green-600'
                              : log.outcome === 'failed'
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTimeGMT7(log.created_at)} · by {log.triggered_by}
                      </p>
                      {log.error && <p className="mt-1 break-all text-xs text-red-600">{log.error}</p>}
                    </div>
                    {(log.outcome === 'failed' || log.outcome === 'skipped') && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingId === log.id}
                        onClick={async () => {
                          setRetryingId(log.id)
                          await onRetryEmail(log)
                          setRetryingId(null)
                        }}
                      >
                        {retryingId === log.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="size-3.5" /> Send
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review notes</p>
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{note.author_name}</span> ·{' '}
                  {formatDateTimeGMT7(note.created_at)}
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.note}</p>
              </div>
            ))}
            <div className="space-y-2">
              <Textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add a note for reviewers..."
                rows={3}
              />
              <Button size="sm" onClick={() => void handleAddNote()} disabled={isAddingNote || !noteDraft.trim()}>
                {isAddingNote ? <Loader2 className="size-4 animate-spin" /> : 'Add note'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
