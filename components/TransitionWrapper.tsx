"use client"

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export default function TransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  )
}
