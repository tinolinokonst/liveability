"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface AppHeaderProps {
  currentPage: 'dashboard' | 'settings'
}

export default function AppHeader({ currentPage }: AppHeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <header
      className="sticky top-0 z-10 px-6 py-4"
      style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-black text-white text-lg tracking-tight">
          Liveability
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/how-it-works"
            className="text-xs font-medium transition-colors hidden sm:block"
            style={{ color: '#a0a0a0' }}
          >
            How It Works
          </Link>
          {currentPage !== 'dashboard' && (
            <Link
              href="/dashboard"
              className="text-xs font-medium transition-colors"
              style={{ color: '#a0a0a0' }}
            >
              Dashboard
            </Link>
          )}
          {currentPage !== 'settings' && (
            <Link
              href="/settings"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#a0a0a0' }}
              title="Account Settings"
            >
              <Settings size={16} />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
