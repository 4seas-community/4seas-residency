'use client'

// Shared status menu body: New / Reviewing / Interview / Accept ▸ / Reject ▸ / Cancelled.
// Used inside a DropdownMenuContent by both the table's status cell and the
// drawer's "More actions" menu so the variant submenus stay identical.

import { Check } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { ALL_STATUSES, STATUS_CONFIG } from '@/lib/types'
import type { Application, ApplicationStatus } from '@/lib/types'
import { defaultDecidedAfterInterview } from '@/lib/applications/utils'

interface StatusMenuItemsProps {
  application: Application
  onSelect: (status: ApplicationStatus, decidedAfterInterview?: boolean) => void
  /** Statuses to omit (e.g. the current one, or the drawer's suggested next action). */
  exclude?: ApplicationStatus[]
}

function VariantItem({
  label,
  isDefault,
  onSelect,
}: {
  label: string
  isDefault: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={isDefault ? 'font-medium' : ''}>
      {label}
      {isDefault && <Check className="ml-auto size-3.5 text-[var(--admin-accent)]" />}
    </DropdownMenuItem>
  )
}

export function StatusMenuItems({ application, onSelect, exclude = [] }: StatusMenuItemsProps) {
  const afterIsDefault = defaultDecidedAfterInterview(application, new Date())
  return (
    <>
      {ALL_STATUSES.filter((status) => !exclude.includes(status)).map((status) => {
        if (status === 'accepted' || status === 'rejected') {
          const beforeLabel = status === 'accepted' ? 'Early (no interview)' : 'Before interview'
          return (
            <DropdownMenuSub key={status}>
              <DropdownMenuSubTrigger>{status === 'accepted' ? 'Accept' : 'Reject'}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <VariantItem label={beforeLabel} isDefault={!afterIsDefault} onSelect={() => onSelect(status, false)} />
                <VariantItem label="After interview" isDefault={afterIsDefault} onSelect={() => onSelect(status, true)} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        }
        return (
          <DropdownMenuItem key={status} onSelect={() => onSelect(status)}>
            {status === 'cancelled' ? 'Mark as cancelled' : STATUS_CONFIG[status].label}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}
