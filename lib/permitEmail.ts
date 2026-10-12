// Server-only: construction-watch emails via the Resend API.
// Short and plain: what was filed, how far away, a link to the official
// notice, and a one-click unsubscribe for that one saved address.

import { PERMIT_DISCLAIMER, WATCH_RADIUS_M } from './permits'
import { SITE_URL } from './site'

const RESEND_URL = 'https://api.resend.com/emails'
// The domain must be verified in Resend; override with EMAIL_FROM if needed
const FROM = process.env.EMAIL_FROM || 'Liveability <alerts@liveability.live>'

export interface PermitMailItem {
  projectType: string
  address: string
  distanceM: number
  publishedAt: string
  sourceUrl: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function unsubscribeUrls(token: string, origin = SITE_URL) {
  return {
    // Page with a single "Stop watching" button: a plain GET never unsubscribes,
    // so link scanners and prefetchers can't switch a watch off by accident
    page: `${origin}/watch/unsubscribe?token=${token}`,
    // RFC 8058 one-click endpoint, POSTed by the mail client itself
    oneClick: `${origin}/api/watch/unsubscribe?token=${token}`,
  }
}

export function buildPermitEmail(savedAddress: string, items: PermitMailItem[], token: string, origin?: string) {
  const { page, oneClick } = unsubscribeUrls(token, origin)
  const n = items.length
  const subject = n === 1
    ? `New building permit ${items[0].distanceM} m from ${savedAddress}`
    : `${n} new building permits near ${savedAddress}`

  const lines = items.map(i =>
    `- ${i.projectType} at ${i.address}, ${i.distanceM} m away (published ${formatDate(i.publishedAt)})\n  Official notice: ${i.sourceUrl}`
  )
  const text = [
    `A building permit application was published within ${WATCH_RADIUS_M} m of ${savedAddress}, an address you saved on Liveability.`,
    '',
    ...lines,
    '',
    PERMIT_DISCLAIMER,
    '',
    `Stop watching this address: ${page}`,
  ].join('\n')

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:560px">
<p>A building permit application was published within ${WATCH_RADIUS_M}&nbsp;m of <strong>${escapeHtml(savedAddress)}</strong>, an address you saved on Liveability.</p>
<ul style="padding-left:18px">${items.map(i => `
<li style="margin-bottom:10px"><strong>${escapeHtml(i.projectType)}</strong> at ${escapeHtml(i.address)}<br>
${i.distanceM}&nbsp;m away · published ${formatDate(i.publishedAt)}<br>
<a href="${escapeHtml(i.sourceUrl)}">Official notice</a></li>`).join('')}
</ul>
<p style="font-size:12px;color:#6b6b6b">${escapeHtml(PERMIT_DISCLAIMER)}</p>
<p style="font-size:12px;color:#6b6b6b"><a href="${escapeHtml(page)}" style="color:#6b6b6b">Stop watching this address</a></p>
</div>`

  return {
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

/** Sends one email. idempotencyKey makes a retried request a no-op at Resend. */
export async function sendEmail(
  to: string,
  mail: ReturnType<typeof buildPermitEmail>,
  idempotencyKey: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers }),
  })
  if (!res.ok) {
    // Resend's error body names the problem; it never echoes the recipient
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
}
