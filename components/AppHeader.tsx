"use client"

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { APP_WIDTH } from './appLayout'

interface AppHeaderProps {
  currentPage: 'dashboard' | 'settings'
}

export default function AppHeader({ currentPage }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 px-6 py-4"
      style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}
    >
      {/* Lined up with the page body: the dashboard's widens from lg up, Settings' doesn't */}
      <div className={`${currentPage === 'dashboard' ? APP_WIDTH : 'max-w-4xl'} mx-auto flex items-center justify-between`}>
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
        </div>
      </div>
    </header>
  )
}
