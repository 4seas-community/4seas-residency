// Seeds 20 fake applications for dashboard development.
// Usage: pnpm seed   (requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local)

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Minimal .env.local loader — no dotenv dependency needed.
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
} catch {
  /* .env.local optional if env vars are already set */
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  process.exit(1)
}
const db = createClient(url, key)

const TRACKS = ['crypto', 'art', 'longevity'] as const
const STATUSES = ['submitted', 'submitted', 'reviewing', 'interview', 'interview', 'accepted', 'rejected', 'cancelled'] as const
const NAMES = [
  'Maya Fernandes', 'Chen Xu', 'Liam O\'Brien', 'Sofia Rossi', 'Arjun Patel',
  'Yuki Tanaka', 'Elena Petrova', 'Daniel Kim', 'Amara Okafor', 'Lucas Silva',
  'Nina Kowalski', 'Omar Haddad', 'Grace Liu', 'Felix Weber', 'Isabella Cruz',
  'Tom Anderson', 'Priya Sharma', 'Jonas Berg', 'Aisha Rahman', 'Marco Bianchi',
]

function startDate(offsetDays: number | null, i: number): string {
  if (offsetDays !== null) {
    // Dates within the cron window (for movein_guide testing)
    const d = new Date(Date.now() + offsetDays * 24 * 3600 * 1000)
    return d.toISOString().slice(0, 10)
  }
  // Regular 1st/15th dates a month or two out
  const d = new Date()
  d.setMonth(d.getMonth() + 1 + (i % 2))
  d.setDate(i % 2 === 0 ? 1 : 15)
  return d.toISOString().slice(0, 10)
}

async function main() {
  const rows = NAMES.map((name, i) => {
    const track = TRACKS[i % TRACKS.length]
    const status = STATUSES[i % STATUSES.length]
    // One accepted application's preferred date lands within 3 days — cron scan picks it up
    const withinCronWindow = status === 'accepted' && i < 10
    const preferredStartDate = startDate(withinCronWindow ? 2 : null, i)

    return {
      track,
      status,
      full_name: name,
      // Resend's official test inbox — deliverable, lands nowhere real
      email: `delivered+seed-${i + 1}@resend.dev`,
      contact_method: i % 2 === 0 ? 'telegram' : 'whatsapp',
      telegram_or_whatsapp: i % 2 === 0 ? `@seed_user_${i + 1}` : `+66 81 234 5${String(i).padStart(3, '0')}`,
      country: ['Portugal', 'China', 'Ireland', 'Italy', 'India', 'Japan'][i % 6],
      preferred_start_date: preferredStartDate,
      // Confirmed defaults to preferred at submission. One later accepted row gets an
      // admin-adjusted confirmed date inside the cron window (preferred stays outside) —
      // exercises the confirmed-over-preferred pick in the cron scan.
      confirmed_start_date: status === 'accepted' && i >= 10 ? startDate(2, i) : preferredStartDate,
      // Terminal decisions alternate between direct and after-interview variants
      decided_after_interview: status === 'accepted' || status === 'rejected' ? i % 16 < 8 : null,
      about: `I am ${name}, a ${track} enthusiast exploring how community and technology intersect. (seeded application #${i + 1})`,
      contribution: 'Workshops, an open-source tool, and weekly community sessions.',
      primary_link: `https://example.com/${i + 1}`,
      linkedin: i % 3 === 0 ? `https://linkedin.com/in/seed${i + 1}` : null,
      extra_link: i % 4 === 0 ? `https://github.com/seed${i + 1}` : null,
      content_studio_plans: i % 5 === 0 ? 'A podcast about community living.' : null,
      ip_hash: `seed-${i % 4}`,
      status_changed_at: status === 'submitted' ? null : new Date().toISOString(),
      status_changed_by: status === 'submitted' ? null : 'Seed Script',
    }
  })

  const { error } = await db.from('applications').insert(rows)
  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }
  console.log(`Seeded ${rows.length} applications.`)
}

void main()
