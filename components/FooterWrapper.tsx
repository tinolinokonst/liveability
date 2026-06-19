"use client"

import { usePathname } from 'next/navigation'
import Footer from './Footer'

const NO_FOOTER_ROUTES = ['/auth']

export default function FooterWrapper() {
  const pathname = usePathname()
  if (NO_FOOTER_ROUTES.includes(pathname)) return null
  return <Footer />
}
