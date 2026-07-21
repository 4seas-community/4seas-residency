'use client'

// Previews the exact email that updateStatus will send: this dialog and the
// server share the same pure template/render functions — what you see is what
// is sent, including admin edits (plain text, re-rendered through renderCustomEmail).

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
import { getEmailContent, renderCustomEmail } from '@/lib/email/templates'
import type { Application, ApplicationStatus, EmailOverride, EmailType } from '@/lib/types'
import { STATUS_CONFIG } from '@/lib/types'

const STATUS_EMAIL: Partial<Record<ApplicationStatus, EmailType>> = {
  interview: 'interview',
  accepted: 'accepted',
  rejected: 'rejected',
}

interface EmailPreviewDialogProps {
  application: Application
  targetStatus: ApplicationStatus
  isPending: boolean
  onConfirm: (sendEmail: boolean, override?: EmailOverride) => void
  onCancel: () => void
}

export function EmailPreviewDialog(props: EmailPreviewDialogProps) {
  const emailType = STATUS_EMAIL[props.targetStatus]
  if (!emailType) return null
  return <EmailPreviewDialogInner {...props} emailType={emailType} />
}

function EmailPreviewDialogInner({
  application,
  targetStatus,
  emailType,
  isPending,
  onConfirm,
  onCancel,
}: EmailPreviewDialogProps & { emailType: EmailType }) {
  const defaults = useMemo(() => getEmailContent(emailType, application), [emailType, application])
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Set status to “{STATUS_CONFIG[targetStatus].label}”
          </DialogTitle>
          <DialogDescription>
            The email below will be sent to <span className="font-medium">{application.email}</span>. You can edit it
            before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" variant={editing ? 'outline' : 'secondary'} onClick={() => setEditing(false)}>
            Preview
          </Button>
          <Button size="sm" variant={editing ? 'secondary' : 'outline'} onClick={() => setEditing(true)}>
            Edit
          </Button>
          {edited && (
            <>
              <span className="text-xs text-muted-foreground">Edited — this version will be sent.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSubject(defaults.subject)
                  setText(defaults.text)
                }}
              >
                Reset to template
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
          <div className="px-4 py-2 border-b border-border bg-muted/40 text-sm flex items-center gap-2">
            <span className="text-muted-foreground shrink-0">Subject:</span>
            {editing ? (
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-7 text-sm" />
            ) : (
              <span className="font-medium text-foreground">{content.subject}</span>
            )}
          </div>
          {editing ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-[45vh] resize-none rounded-none border-0 focus-visible:ring-0 text-sm leading-relaxed"
            />
          ) : (
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="w-full h-[45vh] bg-white"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onConfirm(false, override)} disabled={isPending}>
            Update without sending
          </Button>
          <Button onClick={() => onConfirm(true, override)} disabled={isPending || !subject.trim() || !text.trim()}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update & send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
