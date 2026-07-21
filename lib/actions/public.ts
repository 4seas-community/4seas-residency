'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { TRACKS, TRACK_IDS, type TrackId } from '@/lib/content/tracks'
import { getStartDateOptions, isValidStartDate } from '@/lib/content/start-dates'
import type { ActionResult } from '@/lib/types'

const MAX_SUBMISSIONS_PER_HOUR = 3

const applicationSchema = z.object({
  track: z.enum(TRACK_IDS as [TrackId, ...TrackId[]]),
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  telegramOrWhatsapp: z.string().trim().min(1).max(200),
  country: z.string().trim().min(1).max(120),
  preferredStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  about: z
    .string()
    .trim()
    .min(1)
    .refine((s) => s.split(/\s+/).filter(Boolean).length <= 300, 'Please keep your response under 300 words'),
  contribution: z.string().trim().min(1).max(5000),
  primaryLink: z.string().trim().min(1).max(1000),
  linkedin: z.string().trim().max(1000).optional().default(''),
  extraLink: z.string().trim().max(2000).optional().default(''),
  contentStudioPlans: z.string().trim().max(5000).optional().default(''),
  website: z.string().optional().default(''), // honeypot — humans never see this field
})

export type ApplicationInput = z.input<typeof applicationSchema>

export async function submitApplication(input: ApplicationInput): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation', message: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const data = parsed.data

  // Honeypot: pretend success, store nothing.
  if (data.website) return { ok: true }

  // Authoritative track-state check (the client notice is UX, not security).
  if (TRACKS[data.track].state !== 'open') {
    return { ok: false, error: 'track_closed', message: 'This track is not accepting applications right now.' }
  }

  if (!isValidStartDate(data.preferredStartDate, getStartDateOptions())) {
    return { ok: false, error: 'validation', message: 'Please select a valid start date.' }
  }

  // Rate limit: hash of submitter IP, ≤3 per rolling hour. Raw IP is never stored.
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipHash = createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? '')).digest('hex')

  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString()
  const { count, error: countError } = await db()
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', oneHourAgo)
  if (countError) {
    return { ok: false, error: 'server', message: 'Something went wrong. Please try again.' }
  }
  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) {
    return { ok: false, error: 'rate_limited', message: 'Too many submissions. Please try again later.' }
  }

  const { error } = await db().from('applications').insert({
    track: data.track,
    full_name: data.fullName,
    email: data.email,
    telegram_or_whatsapp: data.telegramOrWhatsapp,
    country: data.country,
    preferred_start_date: data.preferredStartDate,
    about: data.about,
    contribution: data.contribution,
    primary_link: data.primaryLink,
    linkedin: data.linkedin || null,
    extra_link: data.extraLink || null,
    content_studio_plans: data.contentStudioPlans || null,
    ip_hash: ipHash,
  })
  if (error) {
    console.error('submitApplication insert failed:', error.message)
    return { ok: false, error: 'server', message: 'Something went wrong. Please try again.' }
  }

  return { ok: true }
}
