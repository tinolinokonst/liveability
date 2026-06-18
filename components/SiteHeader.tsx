"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'

export default function SiteHeader() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      className="sticky top-0 z-50 px-6 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(15, 15, 15, 0.85)' : 'transparent',
        borderBottom: scrolled ? '1px solid #2a2a2a' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
      }}
      animate={{ paddingTop: scrolled ? 12 : 20, paddingBottom: scrolled ? 12 : 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-black text-lg tracking-tight">
          Liveability
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/how-it-works"
            className="text-sm px-4 py-2 rounded-lg font-medium transition-colors hover:text-white"
            style={{ color: '#a0a0a0' }}
          >
            How It Works
          </Link>

          {loading ? null : userEmail ? (
            <Link
              href="/dashboard"
              className="text-sm px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#f97316' }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-sm px-4 py-2 rounded-lg font-medium transition-colors hover:text-white"
                style={{ color: '#a0a0a0' }}
              >
                Log in
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-sm px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#f97316' }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
