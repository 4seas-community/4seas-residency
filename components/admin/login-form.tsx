'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/actions/admin'

export function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await login({ password })
      if (result.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        setError(result.message ?? 'Login failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-[var(--admin-faint)]">Password</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoComplete="current-password"
          className="h-11 border-[var(--admin-border)] bg-[var(--admin-ink)] text-[var(--admin-text)] placeholder:text-[var(--admin-faint)] focus-visible:ring-[var(--admin-accent)]"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={isSubmitting || !password} className="h-11 w-full bg-[var(--admin-accent)] font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-accent-hover)]">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
      </Button>
    </form>
  )
}
