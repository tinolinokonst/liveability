"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { authCallbackUrl } from '@/lib/site'
import Link from 'next/link'

// Reasons the /auth/callback route can bounce someone back here. Mapped to
// readable copy so a failed confirmation link never fails silently.
const CALLBACK_ERRORS: Record<string, string> = {
  link_expired:
    'That confirmation link has expired or was already used. Sign up again below to get a fresh one.',
  link_invalid:
    'That confirmation link was invalid. Sign up again below to get a fresh one.',
  server_error:
    'We could not complete sign-in because of a server problem. Please try again shortly.',
}

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    const reason = searchParams.get('error')
    if (!reason) return null
    return CALLBACK_ERRORS[reason] ?? 'We could not complete sign-in. Please try again.'
  })
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    } else {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        // Send the confirmation link to the callback route, which exchanges the
        // one-time code for a session. Without this Supabase falls back to the
        // site root, where nothing consumes the code.
        options: { emailRedirectTo: authCallbackUrl() },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account — the link will sign you in.')
      }
    }

    setLoading(false)
  }

  return (
    <>
      <header className="px-6 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
        <Link href="/" className="font-black text-white text-lg tracking-tight">
          Liveability
        </Link>
      </header>
      <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p style={{ color: '#a0a0a0' }} className="text-sm">
            Location intelligence beyond the listing
          </p>
          <p className="text-xs font-semibold mt-1" style={{ color: '#f97316' }}>
            Currently covering Switzerland
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          {/* Mode toggle */}
          <div
            className="flex p-1 rounded-xl mb-6"
            style={{ backgroundColor: '#0f0f0f' }}
          >
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setMessage(null) }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === m ? '#f97316' : 'transparent',
                  color: mode === m ? 'white' : '#a0a0a0',
                }}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0a0a0' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0a0a0' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={8}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#ef44441a', color: '#ef4444', border: '1px solid #ef444433' }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#22c55e1a', color: '#22c55e', border: '1px solid #22c55e33' }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ backgroundColor: '#f97316' }}
            >
              {loading ? '...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>

      </div>
      </div>
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
