"use client"

import { motion } from 'framer-motion'
import { Wind, Footprints, Trees, ShoppingCart, Bus, Building2 } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import BackgroundDecor from '@/components/BackgroundDecor'
import Reveal from '@/components/Reveal'
import MotionLink from '@/components/MotionLink'

const FEATURES = [
  { icon: Wind, label: 'Air Quality', desc: 'Real-time AQI from Open-Meteo' },
  { icon: Footprints, label: 'Walkability', desc: 'Amenities within 800m radius' },
  { icon: Trees, label: 'Green Space', desc: 'Parks and nature access' },
  { icon: ShoppingCart, label: 'Grocery Access', desc: 'Supermarkets and stores nearby' },
  { icon: Bus, label: 'Transit Access', desc: 'Bus stops and transit stations' },
  { icon: Building2, label: 'Neighborhood Scores', desc: '10 Columbus neighborhoods ranked' },
]

export default function Home() {
  return (
    <main style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }} className="relative">
      <BackgroundDecor />
      <SiteHeader />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{ backgroundColor: '#f973161a', color: '#f97316', border: '1px solid #f9731633' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
            Columbus, Ohio · Free to use
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.95] mb-8 tracking-tight"
          >
            Find your perfect<br />
            <span style={{ color: '#f97316' }}>Columbus</span><br />
            neighborhood.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
            className="text-lg sm:text-xl mb-12 leading-relaxed max-w-xl"
            style={{ color: '#a0a0a0' }}
          >
            Rent is one number. Your quality of life is five.
            Air, walkability, green space, grocery access, transit —
            we surface what listing sites hide.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
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
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <Reveal>
          <p style={{ color: '#a0a0a0' }} className="text-xs font-semibold uppercase tracking-widest mb-8">
            What we measure
          </p>
        </Reveal>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.05}>
              <motion.div
                className="rounded-xl p-6 h-full"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(249, 115, 22, 0.25)', borderColor: '#f9731666' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <f.icon size={26} className="mb-4" style={{ color: '#f97316' }} />
                <p className="text-white font-semibold text-sm mb-1.5">{f.label}</p>
                <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <Reveal>
          <div
            className="rounded-2xl p-10 sm:p-16 text-center relative overflow-hidden"
            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
              style={{ background: 'radial-gradient(circle, #f9731633 0%, transparent 70%)' }}
            />
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Ready to find home?</h2>
            <p style={{ color: '#a0a0a0' }} className="mb-10 text-lg">
              Search any Columbus address or browse neighborhood rankings — free.
            </p>
            <MotionLink
              href="/auth?mode=signup"
              className="inline-block px-10 py-4 rounded-xl font-bold text-white"
              style={{ backgroundColor: '#f97316' }}
            >
              Get started free
            </MotionLink>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center justify-between text-xs" style={{ color: '#a0a0a0' }}>
          <span>liveability · Columbus, Ohio</span>
          <span>Data: Open-Meteo · OpenStreetMap · Google Maps</span>
        </div>
      </footer>
    </main>
  )
}
