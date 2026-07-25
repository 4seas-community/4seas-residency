import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { readSession } from '@/lib/auth'
import { LoginForm } from '@/components/admin/login-form'
import { ThemeToggle } from '@/components/admin/theme-toggle'

export const metadata: Metadata = { title: 'Admin Login | 4Seas Residency', robots: { index: false } }

export default async function AdminLoginPage() {
  if (await readSession()) redirect('/admin')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--admin-ink)] px-4 text-[var(--admin-text)]">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="absolute -left-28 top-12 size-96 rounded-full bg-[var(--admin-accent)]/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-20 size-[30rem] rounded-full border border-[var(--admin-accent)]/10" />
      <div className="relative w-full max-w-md rounded-[2rem] border border-[var(--admin-border)] bg-[var(--admin-panel)]/90 p-7 shadow-2xl shadow-black/15 backdrop-blur sm:p-10">
        <div className="mb-10">
          <div className="mb-8 flex items-center gap-3">
            <img
              src="/apple-icon.png"
              alt="4Seas"
              width={40}
              height={40}
              className="size-10 rounded-full border border-[var(--admin-accent)]/30"
            />
            <div className="text-sm font-semibold text-[var(--admin-accent)]">4Seas Residency</div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--admin-text)]">Review desk</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--admin-faint)]">Sign in to review residency applications, decisions, and applicant communications.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
