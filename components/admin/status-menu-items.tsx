'use client'

// Shared status menu body: a flat list — New / Reviewing / Interview / Accept /
// Reject / Mark as cancelled. Used inside a DropdownMenuContent by both the
// table's status cell and the drawer's "More actions" menu. The accepted/rejected
// decision variant (early/before vs after interview) is chosen later, in the
// email preview dialog.

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { ALL_STATUSES, STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus } from '@/lib/types'

interface StatusMenuItemsProps {
  application: Application
  onSelect: (status: ApplicationStatus, decidedAfterInterview?: boolean) => void
  /** Statuses to omit (e.g. the current one, or the drawer's suggested next action). */
  exclude?: ApplicationStatus[]
}

const MENU_LABELS: Partial<Record<ApplicationStatus, string>> = {
  accepted: 'Accept',
  rejected: 'Reject',
  cancelled: 'Mark as cancelled',
}

export function StatusMenuItems({ onSelect, exclude = [] }: StatusMenuItemsProps) {
  return (
    <>
      {ALL_STATUSES.filter((status) => !exclude.includes(status)).map((status) => (
        <DropdownMenuItem key={status} onSelect={() => onSelect(status)}>
          {MENU_LABELS[status] ?? STATUS_CONFIG[status].label}
        </DropdownMenuItem>
      ))}
    </>
  )
}
