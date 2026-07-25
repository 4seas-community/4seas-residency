'use client'

// Previews the exact email the server will send: these dialogs and the server
// share the same pure template/render functions — what you see is what is
// sent, including admin edits (plain text, re-rendered through renderCustomEmail).

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getEmailContent, renderCustomEmail, type EmailContent } from '@/lib/email/templates'
import type { Application, ApplicationStatus, EmailLog, EmailOverride, EmailType } from '@/lib/types'
import { STATUS_CONFIG } from '@/lib/types'

const STATUS_EMAIL: Partial<Record<ApplicationStatus, EmailType>> = {
  interview: 'interview',
  accepted: 'accepted',
  rejected: 'rejected',
}

const BTN_ACCENT = 'bg-[var(--admin-accent)] text-[var(--admin-ink)] hover:bg-[var(--admin-accent-hover)]'
const BTN_OUTLINE =
  'border-[var(--admin-border)] bg-transparent text-[var(--admin-text)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
const BTN_GHOST = 'text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'
const BTN_TOGGLE_ACTIVE =
  'border-[var(--admin-border)] bg-[var(--admin-soft)] text-[var(--admin-text)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-text)]'

interface ComposerProps {
  application: Application
  emailType: EmailType
  /** Baseline content shown on open; defaults to the template for emailType. */
  baseline?: EmailContent
  title: string
  description: React.ReactNode
  isPending: boolean
  onCancel: () => void
  /** Footer buttons; override is undefined while content matches the baseline. */
  renderFooter: (state: { override?: EmailOverride; canSend: boolean }) => React.ReactNode
}

function EmailComposerDialog({
  application,
  emailType,
  baseline,
  title,
  description,
  isPending,
  onCancel,
  renderFooter,
}: ComposerProps) {
  const defaults = useMemo(
    () => baseline ?? getEmailContent(emailType, application),
    [baseline, emailType, application],
  )
  const [subject, setSubject] = useState(defaults.subject)
  const [text, setText] = useState(defaults.text)
  const [editing, setEditing] = useState(false)

  const edited = subject !== defaults.subject || text !== defaults.text
  const content = edited ? renderCustomEmail(subject, text) : defaults
  const override: EmailOverride | undefined = edited ? { subject: subject.trim(), text: text.trim() } : undefined

  // Preview-only: open links in a real tab instead of navigating the sandboxed
  // iframe (where JS is disabled and sites like x.com refuse to render).
  // The sent email HTML is untouched.
  const previewHtml = content.html.replace('<body', '<head><base target="_blank"></head><body')

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="flex max-h-[85vh] flex-col border-[var(--admin-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--admin-text)]">{title}</DialogTitle>
          <DialogDescription className="text-[var(--admin-faint)]">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className={editing ? BTN_OUTLINE : BTN_TOGGLE_ACTIVE} onClick={() => setEditing(false)}>
            Preview
          </Button>
          <Button size="sm" variant="outline" className={editing ? BTN_TOGGLE_ACTIVE : BTN_OUTLINE} onClick={() => setEditing(true)}>
            Edit
          </Button>
          {edited && (
            <>
              <span className="text-xs text-[var(--admin-faint)]">Edited — this version will be sent.</span>
              <Button
                size="sm"
                variant="ghost"
                className={BTN_GHOST}
                onClick={() => {
                  setSubject(defaults.subject)
                  setText(defaults.text)
                }}
              >
                Reset
              </Button>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--admin-border)]">
          <div className="flex items-center gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-2 text-sm">
            <span className="shrink-0 text-[var(--admin-muted)]">Subject:</span>
            {editing ? (
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-7 border-[var(--admin-border)] bg-[var(--admin-ink)] text-sm text-[var(--admin-text)] focus-visible:ring-[var(--admin-accent)]"
              />
            ) : (
              <span className="font-medium text-[var(--admin-text)]">{content.subject}</span>
            )}
          </div>
          {editing ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-[45vh] w-full resize-none rounded-none border-0 bg-[var(--admin-ink)] text-sm leading-relaxed text-[var(--admin-text)] focus-visible:ring-0"
            />
          ) : (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[45vh] w-full bg-white"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {renderFooter({ override, canSend: !!subject.trim() && !!text.trim() })}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EmailPreviewDialogProps {
  application: Application
  targetStatus: ApplicationStatus
  isPending: boolean
  onConfirm: (sendEmail: boolean, override?: EmailOverride) => void
  onCancel: () => void
}

// Status-transition flow: confirm updates the status with or without the email.
export function EmailPreviewDialog({ application, targetStatus, isPending, onConfirm, onCancel }: EmailPreviewDialogProps) {
  const emailType = STATUS_EMAIL[targetStatus]
  if (!emailType) return null
  return (
    <EmailComposerDialog
      application={application}
      emailType={emailType}
      title={`Set status to “${STATUS_CONFIG[targetStatus].label}”`}
      description={
        <>
          The email below will be sent to{' '}
          <span className="font-medium text-[var(--admin-text)]">{application.email}</span>. You can edit it before
          sending.
        </>
      }
      isPending={isPending}
      onCancel={onCancel}
      renderFooter={({ override, canSend }) => (
        <>
          <Button variant="ghost" className={BTN_GHOST} onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" className={BTN_OUTLINE} onClick={() => onConfirm(false, override)} disabled={isPending}>
            Update without sending
          </Button>
          <Button className={BTN_ACCENT} onClick={() => onConfirm(true, override)} disabled={isPending || !canSend}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update & send email'}
          </Button>
        </>
      )}
    />
  )
}

interface ResendEmailDialogProps {
  application: Application
  log: EmailLog
  isPending: boolean
  onConfirm: (override?: EmailOverride) => void
  onCancel: () => void
}

// Resend flow: opens with what that log actually sent (edited body if any),
// editable before sending again. Replaces the old window.confirm.
export function ResendEmailDialog({ application, log, isPending, onConfirm, onCancel }: ResendEmailDialogProps) {
  const verb = log.outcome === 'sent' ? 'Resend' : 'Send'
  const baseline = useMemo(() => {
    const template = getEmailContent(log.email_type, application)
    return log.body_text ? renderCustomEmail(log.subject || template.subject, log.body_text) : template
  }, [log, application])

  return (
    <EmailComposerDialog
      application={application}
      emailType={log.email_type}
      baseline={baseline}
      title={`${verb} email`}
      description={
        log.outcome === 'sent' ? (
          <>
            This email was already delivered to{' '}
            <span className="font-medium text-[var(--admin-text)]">{log.recipient}</span> — confirming sends it again.
            You can edit it first.
          </>
        ) : (
          <>
            This email will be sent to{' '}
            <span className="font-medium text-[var(--admin-text)]">{log.recipient}</span>. You can edit it before
            sending.
          </>
        )
      }
      isPending={isPending}
      onCancel={onCancel}
      renderFooter={({ override, canSend }) => (
        <>
          <Button variant="ghost" className={BTN_GHOST} onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button className={BTN_ACCENT} onClick={() => onConfirm(override)} disabled={isPending || !canSend}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `${verb} email`}
          </Button>
        </>
      )}
    />
  )
}
