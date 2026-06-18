"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type NavSection = 'profile' | 'security' | 'delete'

interface NavItem {
  key: NavSection
  label: string
  icon: React.ElementType
  danger?: boolean
}

const NAV: NavItem[] = [
  { key: 'profile',  label: 'Profile',        icon: User },
  { key: 'security', label: 'Security',       icon: Shield },
  { key: 'delete',   label: 'Delete Account', icon: Trash2, danger: true },
]

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [activeSection, setActiveSection] = useState<NavSection>('profile')

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      <AppHeader currentPage="settings" />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-black text-white mb-1">Account Settings</h1>
        <p className="text-sm mb-8" style={{ color: '#a0a0a0' }}>Manage your account details and security</p>

        {/* Mobile tabs */}
        <div className="flex gap-1 mb-6 sm:hidden">
          {NAV.map(item => {
            const Icon = item.icon
            const active = activeSection === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? (item.danger ? '#ef4444' : '#f97316') : '#1a1a1a',
                  color: active ? 'white' : (item.danger ? '#ef4444' : '#a0a0a0'),
                  border: `1px solid ${active ? 'transparent' : (item.danger ? '#ef444422' : '#2a2a2a')}`,
                }}
              >
                <Icon size={12} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Desktop: sidebar + content */}
        <div className="hidden sm:flex gap-6">
          {/* Sidebar */}
          <nav className="w-44 shrink-0 flex flex-col gap-1">
            {NAV.map(item => {
              const Icon = item.icon
              const active = activeSection === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    backgroundColor: active
                      ? (item.danger ? '#ef44441a' : '#f973161a')
                      : 'transparent',
                    color: active
                      ? (item.danger ? '#ef4444' : '#f97316')
                      : (item.danger ? '#ef4444' : '#a0a0a0'),
                    border: active
                      ? `1px solid ${item.danger ? '#ef444444' : '#f9731644'}`
                      : '1px solid transparent',
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="w-px" style={{ backgroundColor: '#2a2a2a' }} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>

        {/* Mobile content */}
        <div className="sm:hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  )

  function renderContent() {
    if (activeSection === 'profile') {
      return (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h2 className="text-white font-bold mb-5">Profile</h2>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: '#a0a0a0' }}>Email address</label>
            <div
              className="px-4 py-3 rounded-xl text-sm text-white"
              style={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a' }}
            >
              {userEmail}
            </div>
            <p className="text-xs mt-1" style={{ color: '#a0a0a0' }}>
              To change your email, go to the Security section.
            </p>
          </div>
        </div>
      )
    }

    if (activeSection === 'security') {
      return (
        <div className="flex flex-col gap-5">
          {/* Change Email */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-white font-bold mb-1">Change Email</h2>
            <p className="text-xs mb-5" style={{ color: '#a0a0a0' }}>
              Current: <span className="text-white">{userEmail}</span>
            </p>
            <form onSubmit={handleEmailChange} className="flex flex-col gap-4">
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

          {/* Change Password */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <h2 className="text-white font-bold mb-5">Change Password</h2>
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
        </div>
      )
    }

    // Delete Account
    return (
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef444433' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={14} style={{ color: '#ef4444' }} />
          <h2 className="font-bold" style={{ color: '#ef4444' }}>Delete Account</h2>
        </div>
        <p className="text-sm mb-1" style={{ color: '#a0a0a0' }}>
          <strong className="text-white">Permanently remove your account</strong>
        </p>
        <p className="text-sm mb-5" style={{ color: '#a0a0a0' }}>
          This action is <strong className="text-white">permanent and irreversible</strong>. All saved
          addresses and account data will be deleted immediately.
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
    )
  }
}
