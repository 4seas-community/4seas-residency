import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { readSession } from '@/lib/auth'
import { LoginForm } from '@/components/admin/login-form'

export const metadata: Metadata = { title: 'Admin Login | 4Seas Residency', robots: { index: false } }

export default async function AdminLoginPage() {
  if (await readSession()) redirect('/admin')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/images/4seas-logo.png" alt="4Seas" className="h-8 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">4Seas Residency review dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
