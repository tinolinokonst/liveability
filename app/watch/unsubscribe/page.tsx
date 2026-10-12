"use client"

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'

type Status = 'idle' | 'sending' | 'done' | 'error'

function Unsubscribe() {
  const token = useSearchParams().get('token') ?? ''
  const [status, setStatus] = useState<Status>('idle')
  const [address, setAddress] = useState<string | null>(null)

  // One click, but a deliberate one: opening the link alone changes nothing,
  // so email link scanners can't switch a watch off
  async function stop() {
    setStatus('sending')
    try {
      const res = await fetch(`/api/watch/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error()
      setAddress(data?.address ?? null)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-white">Construction watch</h1>
      {status === 'done' ? (
        <p style={{ color: '#a0a0a0' }}>
          Done — you won&apos;t get emails about building permits near{' '}
          {address ? <strong className="text-white">{address}</strong> : 'this address'} any more. You can turn it back
          on from your saved addresses.
        </p>
      ) : (
        <>
          <p style={{ color: '#a0a0a0' }}>
            Stop emails about new building permits near this saved address? Your other watched addresses aren&apos;t affected.
          </p>
          <button
            onClick={stop}
            disabled={!token || status === 'sending'}
            className="px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#f97316' }}
          >
            {status === 'sending' ? 'Stopping…' : 'Stop watching this address'}
          </button>
          {status === 'error' && (
            <p className="text-sm" style={{ color: '#f87171' }}>
              That didn&apos;t work. The link may be incomplete — you can also turn the watch off in your saved addresses.
            </p>
          )}
        </>
      )}
      <Link href="/dashboard" className="text-sm underline" style={{ color: '#f97316' }}>Go to Liveability</Link>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>
      <SiteHeader />
      <Suspense>
        <Unsubscribe />
      </Suspense>
    </div>
  )
}
