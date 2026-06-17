"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Section = 'profile' | 'email' | 'password' | 'delete'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [activeSection, setActiveSection] = useState<Section>('profile')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth')
      } else {
        setUserEmail(data.session.user.email ?? '')
        setAccessToken(data.session.access_token)
        setLoading(false)
      }
    })
  }, [router])

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    if (error) {
      setEmailMsg({ ok: false, text: error.message })
    } else {
      setEmailMsg({ ok: true, text: "You'll receive a confirmation email to verify the change." })
      setNewEmail('')
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: 'New password must be at least 8 characters.' })
      return
    }
    setPasswordLoading(true)
    setPasswordMsg(null)
    const supabase = createClient()
    // Re-authenticate first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordLoading(false)
      setPasswordMsg({ ok: false, text: 'Current password is incorrect.' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ ok: false, text: error.message })
    } else {
      setPasswordMsg({ ok: true, text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteMsg(null)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setDeleteMsg({ ok: false, text: body.error ?? 'Failed to delete account.' })
        setDeleteLoading(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace('/')
    } catch {
      setDeleteMsg({ ok: false, text: 'Something went wrong. Please try again.' })
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="text-sm" style={{ color: '#a0a0a0' }}>Loading...</div>
      </div>
    )
  }

  const sections: Array<{ key: Section; label: string }> = [
    { key: 'profile', label: 'Profile' },
    { key: 'email', label: 'Change Email' },
    { key: 'password', label: 'Change Password' },
    { key: 'delete', label: 'Delete Account' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <header
        className="sticky top-0 z-10 px-6 py-4"
        style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-white text-lg tracking-tight">
            liveability
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium transition-colors"
              style={{ color: '#a0a0a0' }}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-black text-white mb-2">Account Settings</h1>
        <p className="text-sm mb-8" style={{ color: '#a0a0a0' }}>Manage your account details and security</p>

        {/* Section nav */}
        <div className="flex gap-1 flex-wrap mb-8">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: activeSection === s.key ? '#f97316' : '#1a1a1a',
                color: activeSection === s.key ? 'white' : '#a0a0a0',
                border: '1px solid #2a2a2a',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Profile */}
        {activeSection === 'profile' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-white font-bold mb-4">Profile</h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>Email address</label>
              <div
                className="px-4 py-3 rounded-xl text-sm text-white"
                style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
              >
                {userEmail}
              </div>
              <p className="text-xs mt-1" style={{ color: '#a0a0a0' }}>
                Your email is read-only here. Use the Change Email section to update it.
              </p>
            </div>
          </div>
        )}

        {/* Change Email */}
        {activeSection === 'email' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-white font-bold mb-4">Change Email</h2>
            <form onSubmit={handleEmailChange} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>Current email</label>
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: '#0f0f0f', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
                >
                  {userEmail}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>New email address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  required
                  className="px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316]"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
                />
              </div>
              {emailMsg && (
                <p className="text-xs" style={{ color: emailMsg.ok ? '#22c55e' : '#ef4444' }}>{emailMsg.text}</p>
              )}
              <button
                type="submit"
                disabled={emailLoading || !newEmail.trim()}
                className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#f97316' }}
              >
                {emailLoading ? 'Sending...' : 'Update Email'}
              </button>
            </form>
          </div>
        )}

        {/* Change Password */}
        {activeSection === 'password' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-white font-bold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
              {[
                { label: 'Current password', value: currentPassword, setter: setCurrentPassword, placeholder: '' },
                { label: 'New password', value: newPassword, setter: setNewPassword, placeholder: 'Minimum 8 characters' },
                { label: 'Confirm new password', value: confirmPassword, setter: setConfirmPassword, placeholder: '' },
              ].map(field => (
                <div key={field.label} className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>{field.label}</label>
                  <input
                    type="password"
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    required
                    className="px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#f97316]"
                    style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
                  />
                </div>
              ))}
              {passwordMsg && (
                <p className="text-xs" style={{ color: passwordMsg.ok ? '#22c55e' : '#ef4444' }}>{passwordMsg.text}</p>
              )}
              <button
                type="submit"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#f97316' }}
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* Delete Account */}
        {activeSection === 'delete' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef444433' }}>
            <h2 className="font-bold mb-2" style={{ color: '#ef4444' }}>Delete Account</h2>
            <p className="text-sm mb-4" style={{ color: '#a0a0a0' }}>
              This action is <strong className="text-white">permanent and irreversible</strong>. All saved addresses
              and account data will be deleted immediately.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>
                  Type <strong className="text-white">DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="px-4 py-3 rounded-xl text-sm text-white placeholder-[#a0a0a0] outline-none focus:ring-2 focus:ring-[#ef4444]"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
                />
              </div>
              {deleteMsg && (
                <p className="text-xs" style={{ color: deleteMsg.ok ? '#22c55e' : '#ef4444' }}>{deleteMsg.text}</p>
              )}
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm !== 'DELETE'}
                className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#ef4444' }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
