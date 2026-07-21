'use client'

// Previews the exact email that updateStatus will send: this dialog and the
// server share the same pure getEmailContent() — what you see is what is sent.

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
import { getEmailContent } from '@/lib/email/templates'
import type { Application, ApplicationStatus, EmailType } from '@/lib/types'
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
  onConfirm: (sendEmail: boolean) => void
  onCancel: () => void
}

export function EmailPreviewDialog({ application, targetStatus, isPending, onConfirm, onCancel }: EmailPreviewDialogProps) {
  const emailType = STATUS_EMAIL[targetStatus]
  if (!emailType) return null
  const content = getEmailContent(emailType, application)

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Set status to “{STATUS_CONFIG[targetStatus].label}”
          </DialogTitle>
          <DialogDescription>
            The email below will be sent to <span className="font-medium">{application.email}</span>. Review it before
            sending.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
          <div className="px-4 py-2 border-b border-border bg-muted/40 text-sm">
            <span className="text-muted-foreground">Subject: </span>
            <span className="font-medium text-foreground">{content.subject}</span>
          </div>
          <iframe title="Email preview" srcDoc={content.html} className="w-full h-[45vh] bg-white" sandbox="" />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onConfirm(false)} disabled={isPending}>
            Update without sending
          </Button>
          <Button onClick={() => onConfirm(true)} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update & send email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
