"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import type { MaritalStatus } from '@/lib/tax'

// Household inputs for the Monthly Budget. Held in React state and mirrored to
// sessionStorage (this tab only, gone when it closes) — never sent to Supabase
// and never attached to AddressMetrics, which is what saved addresses persist.

export interface Household {
  /** Gross annual household income, CHF; null until the user enters one */
  grossIncome: number | null
  status: MaritalStatus
  adults: number
  children: number
}

export const DEFAULT_HOUSEHOLD: Household = { grossIncome: null, status: 'single', adults: 1, children: 0 }

const STORAGE_KEY = 'liveability:household'

interface HouseholdContextValue {
  household: Household
  setHousehold: (update: Partial<Household>) => void
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

function readStored(): Household {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_HOUSEHOLD
    const v = JSON.parse(raw) as Partial<Household>
    return {
      grossIncome: typeof v.grossIncome === 'number' && v.grossIncome > 0 ? v.grossIncome : null,
      status: v.status === 'married' ? 'married' : 'single',
      adults: Number.isInteger(v.adults) && (v.adults as number) >= 1 ? (v.adults as number) : 1,
      children: Number.isInteger(v.children) && (v.children as number) >= 0 ? (v.children as number) : 0,
    }
  } catch {
    return DEFAULT_HOUSEHOLD
  }
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [household, setState] = useState<Household>(DEFAULT_HOUSEHOLD)

  // Read after mount so server and first client render agree
  useEffect(() => { setState(readStored()) }, [])

  function setHousehold(update: Partial<Household>) {
    setState(prev => {
      const next = { ...prev, ...update }
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage blocked: state still works */ }
      return next
    })
  }

  return <HouseholdContext.Provider value={{ household, setHousehold }}>{children}</HouseholdContext.Provider>
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>')
  return ctx
}
