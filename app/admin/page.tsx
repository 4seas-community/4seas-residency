import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { getDashboardData } from '@/lib/db'
import { AdminDashboard } from '@/components/admin/dashboard'

export const metadata: Metadata = { title: 'Applications | 4Seas Admin', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await requireAdmin()
  const data = await getDashboardData()

  return <AdminDashboard initialData={data} adminName={session.displayName} />
}
