"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wind, Footprints, Trees, ShoppingCart, Bus,
  Sun, Volume2, Shield, Utensils, GraduationCap,
  Heart, BookOpen, Landmark, Building2, Car, Users,
  TriangleAlert, Wallet, HardHat,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import SiteHeader from '@/components/SiteHeader'
import BackgroundDecor from '@/components/BackgroundDecor'
import Reveal from '@/components/Reveal'
import MotionLink from '@/components/MotionLink'
import UsWaitlistBanner from '@/components/UsWaitlistBanner'
import CoverageNote, { BrowseKind } from '@/components/CoverageNote'
import { useFeatureFlags } from '@/components/FeatureFlags'

// `desc` is the Swiss-only wording (US_ENABLED off); `both` replaces it while
// US addresses are searchable, naming each country's source or saying which
// country a card is limited to.
const FEATURES = [
  { icon: Wind,          label: 'Air Quality',          desc: 'BAFU air pollution modeling at your address', both: 'BAFU modeling in Switzerland, EPA AirNow in the US' },
  { icon: Sun,           label: 'Sunlight',              desc: 'Daily sun hours and UV index estimates', both: 'Sun hours and UV (CH), NLR solar resource (US)' },
  { icon: Volume2,       label: 'Noise',                 desc: 'Modeled dB values from sonBASE (BAFU)', both: 'Modeled noise from sonBASE (CH) and the BTS noise map (US)' },
  { icon: Shield,        label: 'Safety & Crime',        desc: 'Canton-level FSO crime statistics', both: 'Canton-level (CH) / city-level (US) crime statistics' },
  { icon: Footprints,    label: 'Walkability',           desc: 'Amenities within your chosen radius', both: 'Nearby amenities (CH), EPA Walkability Index (US)' },
  { icon: Bus,           label: 'Transit Access',        desc: 'Live Swiss departures via transport.​opendata.ch', both: 'Live departures (CH) and transit stops (US)' }, // ​: wrap point for narrow cards
  { icon: ShoppingCart,  label: 'Grocery Access',        desc: 'Supermarkets and food stores nearby', both: 'Supermarkets and food stores nearby' },
  { icon: GraduationCap, label: 'Schools',               desc: 'K–12 schools and universities nearby', both: 'Schools nearby, from OpenStreetMap (CH) and NCES (US)' },
  { icon: Heart,         label: 'Healthcare',            desc: 'Hospitals, clinics, and pharmacies nearby', both: 'Hospitals, clinics, pharmacies (CH); CDC health estimates (US)' },
  { icon: Users,         label: 'Community Snapshot',    desc: 'Your commune, from swisstopo boundaries', both: 'Commune (CH) / census tract (US)' },
  { icon: TriangleAlert, label: 'Risks',                 desc: 'Natural hazard zones and contaminated sites', both: 'Hazard maps and polluted sites (CH), FEMA and EPA (US)' },
  { icon: Wallet,        label: 'Monthly Budget',        desc: 'Tax, health insurance and rent for your household', both: 'Tax and rent for your household, in CHF or US$' },
  { icon: HardHat,       label: 'Construction Watch',    desc: 'Building permits near your saved addresses', both: 'Building permits near saved addresses — Switzerland only' },
  { icon: Utensils,      label: 'Dining & Cafes',        desc: 'Restaurants and cafes within reach', both: 'Restaurants and cafes within reach (Switzerland)' },
  { icon: Trees,         label: 'Green Space & Parks',   desc: 'Parks, gardens, and recreation areas', both: 'Parks, gardens, and recreation areas (Switzerland)' },
  { icon: BookOpen,      label: 'Library Access',        desc: 'Public libraries in the area', both: 'Public libraries in the area (Switzerland)' },
  { icon: Landmark,      label: 'Banks & ATMs',          desc: 'Banking and ATMs in the area', both: 'Banking and ATMs in the area (Switzerland)' },
  { icon: Building2,     label: 'Places of Worship',     desc: 'Religious buildings near the address', both: 'Religious buildings nearby (Switzerland)' },
  { icon: Car,           label: 'Parking',               desc: 'Parking availability in the immediate area', both: 'Parking in the immediate area (Switzerland)' },
]

export default function HomePage() {
  const { us } = useFeatureFlags()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
  }, [])

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }} className="relative">
      <BackgroundDecor />
      <SiteHeader />

      {/* Non-Swiss visitors only; renders nothing otherwise */}
      <div className="max-w-5xl mx-auto px-6 pt-6 empty:hidden">
        <UsWaitlistBanner className="max-w-2xl" />
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-12 sm:pt-20 pb-20 sm:pb-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ backgroundColor: '#f973161a', color: '#f97316', border: '1px solid #f9731633' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
            Free to use
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.95] mb-6 sm:mb-8 tracking-tight"
          >
            Find where<br />
            to <span style={{ color: '#f97316' }}>live</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            className="text-sm font-semibold mb-6"
            style={{ color: '#f97316' }}
          >
            <CoverageNote />
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="text-lg sm:text-xl mb-10 sm:mb-12 leading-relaxed max-w-xl"
            style={{ color: '#a0a0a0' }}
          >
            Rent is one number. Your quality of life is many.{' '}
            {/* &nbsp; keeps each dash on the line with the word before it */}
            Air quality, walkability, safety, transit, green space&nbsp;— and many more&nbsp;—
            we surface what listing sites hide.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {loggedIn ? (
              <MotionLink
                href="/dashboard"
                className="px-8 py-4 rounded-xl font-bold text-white text-base text-center"
                style={{ backgroundColor: '#f97316' }}
              >
                Go to Dashboard
              </MotionLink>
            ) : (
              <>
                <MotionLink
                  href="/auth?mode=signup"
                  className="px-8 py-4 rounded-xl font-bold text-white text-base text-center"
                  style={{ backgroundColor: '#f97316' }}
                >
                  Start exploring for free
                </MotionLink>
                <MotionLink
                  href="/auth"
                  className="px-8 py-4 rounded-xl font-semibold text-sm text-center"
                  style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
                >
                  Already have an account
                </MotionLink>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20 sm:pb-32">
        <Reveal>
          <p style={{ color: '#a0a0a0' }} className="text-xs font-semibold uppercase tracking-widest mb-8">
            What we measure
          </p>
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.05}>
              <motion.div
                className="rounded-xl p-4 sm:p-6 h-full"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(249, 115, 22, 0.25)', borderColor: '#f9731666' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <f.icon size={26} className="mb-4" style={{ color: '#f97316' }} />
                <p className="text-white font-semibold text-sm mb-1.5">{f.label}</p>
                <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed [overflow-wrap:anywhere]">{us ? f.both : f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-20 sm:pb-32">
        <Reveal>
          <div
            className="rounded-2xl px-6 py-10 sm:p-16 text-center relative overflow-hidden"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
              style={{ background: 'radial-gradient(circle, #f9731633 0%, transparent 70%)' }}
            />
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">Ready to find home?</h2>
            <p style={{ color: '#a0a0a0' }} className="mb-8 sm:mb-10 text-base sm:text-lg">
              <BrowseKind /> — free.
            </p>
            {loggedIn ? (
              <MotionLink
                href="/dashboard"
                className="px-10 py-4 rounded-xl font-bold text-white"
                style={{ backgroundColor: '#f97316' }}
              >
                Go to Dashboard
              </MotionLink>
            ) : (
              <MotionLink
                href="/auth?mode=signup"
                className="px-10 py-4 rounded-xl font-bold text-white"
                style={{ backgroundColor: '#f97316' }}
              >
                Get started free
              </MotionLink>
            )}
          </div>
        </Reveal>
      </section>

    </div>
  )
}
