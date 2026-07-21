// Pure, isomorphic email templates. Imported by BOTH the admin preview dialog
// (client) and the send module (server) — "what you preview is what you send"
// is guaranteed by sharing this single function. No secrets in this file.

import { TRACKS } from '@/lib/content/tracks'
import { COMMUNITY_LINKS, COLIVING_PROMO_CODE } from '@/lib/content/site'
import type { Application, EmailType } from '@/lib/types'

export interface EmailContent {
  subject: string
  html: string
  text: string
}

function formatStartDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${months[(m ?? 1) - 1]} ${d}, ${y}`
}

function wrapLayout(bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f5f2ea;font-family:Helvetica,Arial,sans-serif;color:#1e2b28;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fdfcf9;border:1px solid #e3ded1;border-radius:12px;padding:32px;">
      ${bodyHtml}
      <p style="margin:32px 0 0;font-size:13px;color:#6b7672;line-height:1.6;">
        4Seas Residency · Chiang Mai, Thailand<br/>
        <a href="${COMMUNITY_LINKS.website}" style="color:#0A6B5A;">4seas.xyz</a> ·
        <a href="${COMMUNITY_LINKS.telegram}" style="color:#0A6B5A;">Telegram</a> ·
        <a href="${COMMUNITY_LINKS.x}" style="color:#0A6B5A;">X</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${text}</p>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function linkify(escaped: string): string {
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#0A6B5A;">${url}</a>`)
}

/**
 * Renders admin-edited plain text through the same brand layout as the templates.
 * Shared by the preview dialog and the send module, so editing keeps the
 * "what you preview is what you send" guarantee. Blank lines separate paragraphs.
 */
export function renderCustomEmail(subject: string, text: string): EmailContent {
  const html = wrapLayout(
    text
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => p(linkify(escapeHtml(para)).replace(/\n/g, '<br/>')))
      .join('')
  )
  return { subject, text, html }
}

export function getEmailContent(type: EmailType, application: Application): EmailContent {
  const track = TRACKS[application.track]
  const trackName = track?.name ?? 'Residency'
  const firstName = application.full_name.trim().split(/\s+/)[0] || application.full_name
  const startDate = formatStartDate(application.preferred_start_date)

  switch (type) {
    case 'interview': {
      const subject = `Interview invitation — 4Seas ${trackName}`
      const bodyText = [
        `Hi ${firstName},`,
        `Good news — we'd like to invite you to a short interview for the 4Seas ${trackName} in Chiang Mai.`,
        `Simply reply to this email with a few time slots that work for you, and we'll confirm one. Please note our team is based in Chiang Mai (GMT+7).`,
        `The interview is an informal conversation about your work, your plans during the residency, and what you'd like to contribute to the community.`,
        `Talk soon,\nThe 4Seas Team`,
      ]
      return {
        subject,
        text: bodyText.join('\n\n'),
        html: wrapLayout(
          p(`Hi ${firstName},`) +
            p(`Good news — we'd like to invite you to a short interview for the <strong>4Seas ${trackName}</strong> in Chiang Mai.`) +
            p(`Simply <strong>reply to this email</strong> with a few time slots that work for you, and we'll confirm one. Please note our team is based in Chiang Mai (<strong>GMT+7</strong>).`) +
            p(`The interview is an informal conversation about your work, your plans during the residency, and what you'd like to contribute to the community.`) +
            p(`Talk soon,<br/>The 4Seas Team`)
        ),
      }
    }
    case 'accepted': {
      const subject = `You're in — 4Seas ${trackName}`
      const bodyText = [
        `Hi ${firstName},`,
        `Congratulations — you've been accepted to the 4Seas ${trackName} in Chiang Mai!`,
        `Your residency start date: ${startDate}.`,
        `Next steps:\n1. Reply to this email to confirm your start date.\n2. Arrange your travel to Chiang Mai.\n3. About 3 days before your start date, we'll send you a move-in guide with the address and arrival details.`,
        `If your plans change or you have any questions, just reply to this email.`,
        `See you in Chiang Mai,\nThe 4Seas Team`,
      ]
      return {
        subject,
        text: bodyText.join('\n\n'),
        html: wrapLayout(
          p(`Hi ${firstName},`) +
            p(`Congratulations — you've been accepted to the <strong>4Seas ${trackName}</strong> in Chiang Mai!`) +
            p(`Your residency start date: <strong>${startDate}</strong>.`) +
            p(
              `Next steps:<br/>1. Reply to this email to confirm your start date.<br/>2. Arrange your travel to Chiang Mai.<br/>3. About 3 days before your start date, we'll send you a move-in guide with the address and arrival details.`
            ) +
            p(`If your plans change or you have any questions, just reply to this email.`) +
            p(`See you in Chiang Mai,<br/>The 4Seas Team`)
        ),
      }
    }
    case 'rejected': {
      // ponytail: placeholder wording — the community's existing rejection template
      // copy will replace the middle paragraphs before M5 launch.
      const subject = `Your 4Seas ${trackName} application`
      const bodyText = [
        `Hi ${firstName},`,
        `Thank you for applying to the 4Seas ${trackName}. After careful review, we're unable to offer you a spot in this cycle.`,
        `This is mostly a matter of fit and limited space for each cycle — we'd genuinely love to see you apply again in a future cycle.`,
        `In the meantime, you're warmly welcome to stay with us as a coliving guest in Chiang Mai. Use the code ${COLIVING_PROMO_CODE} for a discount on your coliving stay.`,
        `Stay in touch with the community on Telegram: ${COMMUNITY_LINKS.telegram}`,
        `Warmly,\nThe 4Seas Team`,
      ]
      return {
        subject,
        text: bodyText.join('\n\n'),
        html: wrapLayout(
          p(`Hi ${firstName},`) +
            p(`Thank you for applying to the <strong>4Seas ${trackName}</strong>. After careful review, we're unable to offer you a spot in this cycle.`) +
            p(`This is mostly a matter of fit and limited space for each cycle — we'd genuinely love to see you apply again in a future cycle.`) +
            p(`In the meantime, you're warmly welcome to stay with us as a coliving guest in Chiang Mai. Use the code <strong>${COLIVING_PROMO_CODE}</strong> for a discount on your coliving stay.`) +
            p(`Stay in touch with the community on <a href="${COMMUNITY_LINKS.telegram}" style="color:#0A6B5A;">Telegram</a>.`) +
            p(`Warmly,<br/>The 4Seas Team`)
        ),
      }
    }
    case 'movein_guide': {
      // ponytail: address/arrival details are placeholders until the community provides them.
      const subject = `Your move-in guide — 4Seas ${trackName} (starts ${startDate})`
      const bodyText = [
        `Hi ${firstName},`,
        `Your 4Seas residency starts on ${startDate} — here's everything you need for arrival.`,
        `Address: 4Seas, Chiang Mai (detailed address & map link will be provided here).`,
        `Getting here: from Chiang Mai International Airport, a taxi/Grab takes about 20-30 minutes.`,
        `On arrival: message us on Telegram (${COMMUNITY_LINKS.telegram}) or simply reply to this email and we'll meet you.`,
        `Safe travels — see you soon!\nThe 4Seas Team`,
      ]
      return {
        subject,
        text: bodyText.join('\n\n'),
        html: wrapLayout(
          p(`Hi ${firstName},`) +
            p(`Your 4Seas residency starts on <strong>${startDate}</strong> — here's everything you need for arrival.`) +
            p(`<strong>Address:</strong> 4Seas, Chiang Mai (detailed address &amp; map link will be provided here).`) +
            p(`<strong>Getting here:</strong> from Chiang Mai International Airport, a taxi/Grab takes about 20-30 minutes.`) +
            p(`<strong>On arrival:</strong> message us on <a href="${COMMUNITY_LINKS.telegram}" style="color:#0A6B5A;">Telegram</a> or simply reply to this email and we'll meet you.`) +
            p(`Safe travels — see you soon!<br/>The 4Seas Team`)
        ),
      }
    }
  }
}
