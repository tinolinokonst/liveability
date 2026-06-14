"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wind,
  Footprints,
  Shield,
  Newspaper,
  Bot,
  Database,
  Link2,
  RefreshCw,
  Calculator,
  Clock,
  Lock,
  ChevronDown,
  X,
  Check,
} from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import BackgroundDecor from '@/components/BackgroundDecor'
import Reveal from '@/components/Reveal'

const METHODOLOGY = [
  {
    icon: Wind,
    title: 'Air Quality',
    desc: 'Pulled from EPA AirNow, using readings from the nearest monitoring station to the searched address.',
  },
  {
    icon: Footprints,
    title: 'Walkability & Amenities',
    desc: 'Grocery stores, parks, schools, libraries, healthcare, dining, banks, places of worship, and parking are all community-mapped on OpenStreetMap and counted within the radius you choose.',
  },
  {
    icon: Shield,
    title: 'Safety',
    desc: 'Crime incident data from City of Columbus GIS, covering a 12-month window around the searched address.',
  },
  {
    icon: Newspaper,
    title: 'Local News',
    desc: 'Recent headlines relevant to the area, pulled live via Google News for each search.',
  },
]

const FRESHNESS = [
  { icon: Wind, title: 'Air quality', desc: 'Near real-time — EPA AirNow updates hourly.' },
  { icon: Shield, title: 'Crime data', desc: 'Updated monthly from City of Columbus records.' },
  { icon: Footprints, title: 'OpenStreetMap amenities', desc: 'Community-maintained, generally accurate but can lag for very recent openings or closures.' },
  { icon: Newspaper, title: 'News', desc: 'Pulled live every time you search.' },
]

const FAQ = [
  {
    q: 'Why Columbus, Ohio?',
    a: 'Liveability launched in Columbus because it has rich, accessible open data (city GIS, EPA monitoring, dense OpenStreetMap coverage) that lets us show real, verifiable numbers rather than estimates.',
  },
  {
    q: 'Is Liveability free?',
    a: 'Yes. Searching addresses, comparing them, exploring neighborhoods, and saving addresses to your account are all free.',
  },
  {
    q: 'How accurate is the data?',
    a: 'Every number comes directly from its source — EPA AirNow, OpenStreetMap, or City of Columbus GIS — at the time of your search. Accuracy depends on how current and complete those sources are; see the Data Freshness section above for details.',
  },
  {
    q: 'Can I request other cities?',
    a: 'Not yet, but expanding beyond Columbus is on the roadmap. The same data sources (EPA, OpenStreetMap, and city open-data portals) exist for most U.S. cities.',
  },
  {
    q: 'What if a data point seems wrong?',
    a: 'Click any metric to see its source and a link to the underlying data. If something looks off, it likely reflects the source data itself — OpenStreetMap in particular can be edited by anyone, so feel free to correct it there.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left p-4"
      >
        <span className="text-white font-semibold text-sm">{q}</span>
        <ChevronDown
          size={18}
          style={{ color: '#a0a0a0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 250ms ease' }}
        />
      </button>
      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 250ms ease, opacity 250ms ease',
        }}
      >
        <div className="overflow-hidden">
          <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed px-4 pb-4">
            {a}
          </p>
        </div>
      </div>
    </div>
  )
}

const cardHover = {
  whileHover: { y: -4, boxShadow: '0 12px 24px -8px rgba(249, 115, 22, 0.25)', borderColor: '#f9731666' },
  transition: { duration: 0.25, ease: 'easeOut' },
} as const

export default function HowItWorks() {
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0f0f0f' }}>
      <BackgroundDecor />
      <SiteHeader />

      <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-32">
        {/* Hero */}
        <section className="max-w-3xl pt-8">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.95] mb-8 tracking-tight"
          >
            Real data,<br />
            not <span style={{ color: '#f97316' }}>guesswork</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="text-lg sm:text-xl leading-relaxed max-w-xl"
            style={{ color: '#a0a0a0' }}
          >
            Liveability shows verified, address-level data on air quality, safety, walkability,
            and nearby amenities for Columbus, Ohio — pulled straight from official sources for
            the exact coordinates of the address you search.
          </motion.p>
        </section>

        {/* Why not just ask AI */}
        <section>
          <Reveal>
            <p style={{ color: '#a0a0a0' }} className="text-xs font-semibold uppercase tracking-widest mb-3">
              The difference
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Why not just ask AI?</h2>
            <p style={{ color: '#a0a0a0' }} className="text-base sm:text-lg mb-10 max-w-2xl leading-relaxed">
              General-purpose chatbots are great for a lot of things, but they&apos;re not built to give
              you live, verifiable, address-level data.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal delay={0.05}>
              <motion.div
                className="rounded-2xl p-8 h-full"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                {...cardHover}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2a2a2a' }}>
                    <Bot size={22} style={{ color: '#a0a0a0' }} />
                  </div>
                  <h3 className="text-white font-bold text-lg">AI chatbots</h3>
                </div>
                <ul className="flex flex-col gap-4 text-sm" style={{ color: '#a0a0a0' }}>
                  <li className="flex items-start gap-3">
                    <X size={18} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    General knowledge, not tied to a specific address
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    Training data can be outdated
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    No source citations for specific numbers
                  </li>
                  <li className="flex items-start gap-3">
                    <X size={18} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    Can&apos;t be independently verified
                  </li>
                </ul>
              </motion.div>
            </Reveal>
            <Reveal delay={0.15}>
              <motion.div
                className="rounded-2xl p-8 h-full relative overflow-hidden"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #f97316' }}
                {...cardHover}
              >
                <div
                  className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full"
                  style={{ background: 'radial-gradient(circle, #f9731633 0%, transparent 70%)' }}
                />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f973161a' }}>
                    <Database size={22} style={{ color: '#f97316' }} />
                  </div>
                  <h3 className="text-white font-bold text-lg">Liveability</h3>
                </div>
                <ul className="flex flex-col gap-4 text-sm" style={{ color: '#a0a0a0' }}>
                  <li className="flex items-start gap-3">
                    <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    Live data for the exact coordinates of your address
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    Pulled from EPA AirNow, OpenStreetMap, and City of Columbus GIS
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    Every number links back to its source
                  </li>
                  <li className="flex items-start gap-3">
                    <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    Updated continuously
                  </li>
                </ul>
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* Methodology */}
        <section>
          <Reveal>
            <p style={{ color: '#a0a0a0' }} className="text-xs font-semibold uppercase tracking-widest mb-3">
              Methodology
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">How the data works</h2>
            <p style={{ color: '#a0a0a0' }} className="text-base sm:text-lg mb-12 max-w-2xl leading-relaxed">
              Each metric comes from a specific, named source.
            </p>
          </Reveal>
          <div className="relative">
            <div
              className="hidden sm:block absolute left-[27px] top-12 bottom-12 w-px"
              style={{ backgroundColor: '#2a2a2a' }}
            />
            <div className="flex flex-col gap-6">
              {METHODOLOGY.map((m, i) => (
                <Reveal key={m.title} delay={i * 0.08}>
                  <motion.div
                    className="rounded-2xl p-6 flex gap-5 items-start relative"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    {...cardHover}
                  >
                    <div
                      className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black relative z-10"
                      style={{ backgroundColor: '#f973161a', color: '#f97316', border: '1px solid #f9731633' }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <m.icon size={18} style={{ color: '#f97316' }} />
                        <h3 className="text-white font-bold text-base">{m.title}</h3>
                      </div>
                      <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">{m.desc}</p>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Scores */}
        <section>
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-10 tracking-tight">How scores are calculated</h2>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl p-6 sm:p-8 flex flex-col gap-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <div className="flex items-start gap-4">
                <Calculator size={22} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                <p style={{ color: '#a0a0a0' }} className="text-sm sm:text-base leading-relaxed">
                  <span className="text-white font-semibold">Amenity scores</span> (grocery, transit, parks,
                  schools, healthcare, dining, libraries, banks, worship, parking) are based on how many
                  of each are found, and how close they are, within the radius you select.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Calculator size={22} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                <p style={{ color: '#a0a0a0' }} className="text-sm sm:text-base leading-relaxed">
                  <span className="text-white font-semibold">Air quality</span> uses the EPA&apos;s standard
                  AQI categories (Good, Moderate, Unhealthy, etc.) to translate the raw AQI number into a score.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Calculator size={22} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                <p style={{ color: '#a0a0a0' }} className="text-sm sm:text-base leading-relaxed">
                  <span className="text-white font-semibold">Safety score</span> is inverse to incident
                  density — fewer reported incidents nearby means a higher score.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <Link2 size={22} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                <p style={{ color: '#a0a0a0' }} className="text-sm sm:text-base leading-relaxed">
                  Scores are a quick summary, but the underlying raw numbers — counts, distances,
                  AQI readings, incident totals — are always visible and clickable for full detail.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Data freshness */}
        <section>
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-10 tracking-tight">Data freshness</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-6">
            {FRESHNESS.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <motion.div
                  className="rounded-2xl p-6 flex gap-4 h-full"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  {...cardHover}
                >
                  <RefreshCw size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1.5">{f.title}</h3>
                    <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section>
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-10 tracking-tight">Privacy</h2>
            <motion.div className="rounded-2xl p-6 sm:p-8 flex gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }} {...cardHover}>
              <Lock size={22} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p style={{ color: '#a0a0a0' }} className="text-sm sm:text-base leading-relaxed">
                Addresses you save are tied to your account only — they&apos;re never shared or sold.
                You can delete any saved address at any time.
              </p>
            </motion.div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section className="pb-16">
          <Reveal>
            <div className="flex items-center gap-3 mb-10">
              <Clock size={28} style={{ color: '#f97316' }} />
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">FAQ</h2>
            </div>
          </Reveal>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.04}>
                <FaqItem q={item.q} a={item.a} />
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center justify-between text-xs" style={{ color: '#a0a0a0' }}>
          <span>liveability · Columbus, Ohio</span>
          <span>Data: EPA AirNow · OpenStreetMap · City of Columbus GIS</span>
        </div>
      </footer>
    </div>
  )
}
