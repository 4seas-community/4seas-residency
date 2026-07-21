import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'admin_session'
const SESSION_DAYS = 30

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET not configured')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export interface AdminSession {
  displayName: string
}

export async function createSession(displayName: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000
  const payload = Buffer.from(JSON.stringify({ displayName, expiresAt })).toString('base64url')
  const value = `${payload}.${sign(payload)}`
  const store = await cookies()
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function readSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.displayName !== 'string' || typeof data.expiresAt !== 'number') return null
    if (Date.now() > data.expiresAt) return null
    return { displayName: data.displayName }
  } catch {
    return null
  }
}

/** Security boundary for every admin server entry. Redirects when unauthenticated. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await readSession()
  if (!session) redirect('/admin/login')
  return session
}

/** Constant-time password comparison. */
export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // Still burn a comparison to keep timing uniform
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected))
    return false
  }
  return timingSafeEqual(a, b)
}
