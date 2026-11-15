"use client"

import { usePathname } from 'next/navigation'
import Footer from './Footer'
import MinimalFooter from './MinimalFooter'

// The full footer (description, links, data sources) only on public marketing
// pages; the app (/dashboard, /settings, /auth, ...) gets one line
const MARKETING_ROUTES = new Set(['/', '/how-it-works', '/about', '/privacy', '/terms', '/cookie-policy'])

export default function FooterWrapper() {
  const pathname = usePathname()
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return MARKETING_ROUTES.has(path) ? <Footer /> : <MinimalFooter />
}
