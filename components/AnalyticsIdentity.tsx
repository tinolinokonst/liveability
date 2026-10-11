"use client"

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { identifyUser, resetUser } from '@/lib/analytics'

// Links PostHog events to the signed-in Supabase user ID (never the email) and
// starts a fresh anonymous ID on sign-out. Renders nothing.
export default function AnalyticsIdentity() {
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) identifyUser(session.user.id)
      else if (event === 'SIGNED_OUT') resetUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  return null
}
