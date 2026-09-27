"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MIN_PASSWORD_LENGTH = 8

// Landing page for password-recovery links. By the time the user gets here the
// /auth/callback route has already exchanged the recovery code for a session,
// so updateUser() can set the new password directly. Without that session (the
// link expired, was reused, or was opened in a different browser) there is
// nothing to update, so we say so and point back to the request form.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'ready' | 'no-session' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'no-session')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    setStatus('done')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316] transition-all'
  const inputStyle = { backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }

  return (
    <>
      <header className="px-6 py-4" style={{ borderBottom: '1px solid #2a2a2a' }}>
        <Link href="/" className="font-black text-white text-lg tracking-tight">
          Liveability
        </Link>
      </header>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-8"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <h1 className="text-white font-bold mb-1">Set a new password</h1>

            {status === 'checking' && (
              <p className="text-sm mt-4" style={{ color: '#a0a0a0' }}>Checking your reset link...</p>
            )}

            {status === 'no-session' && (
              <div className="flex flex-col gap-4 mt-4">
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: '#ef44441a', color: '#ef4444', border: '1px solid #ef444433' }}
                >
                  This reset link has expired, was already used, or was opened in a different
                  browser from the one you requested it in.
                </div>
                <Link
                  href="/auth?mode=forgot"
                  className="w-full py-3 rounded-xl font-bold text-white text-sm text-center"
                  style={{ backgroundColor: '#f97316' }}
                >
                  Request a new link
                </Link>
              </div>
            )}

            {status === 'done' && (
              <div className="flex flex-col gap-4 mt-4">
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: '#22c55e1a', color: '#22c55e', border: '1px solid #22c55e33' }}
                >
                  Your password has been updated.
                </div>
                <button
                  onClick={() => router.replace('/dashboard')}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm"
                  style={{ backgroundColor: '#f97316' }}
                >
                  Continue to dashboard
                </button>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0a0a0' }}>
                    New password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#a0a0a0' }}>
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className={inputClass}
                    style={inputStyle}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                  style={{ backgroundColor: '#f97316' }}
                >
                  {loading ? '...' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
