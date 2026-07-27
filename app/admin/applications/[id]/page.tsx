import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getApplicationDetail } from '@/lib/db'
import { ApplicationPage } from '@/components/admin/application-page'

export const metadata: Metadata = { title: 'Application | 4Seas Admin', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  const { id } = await params
  const data = await getApplicationDetail(id)
  if (!data) notFound()

  return <ApplicationPage initialData={data} adminName={session.displayName} />
}
