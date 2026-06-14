"use client"

import { useState } from 'react'
import Link from 'next/link'
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
          style={{ color: '#a0a0a0', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>
      {open && (
        <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed px-4 pb-4">
          {a}
        </p>
      )}
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f0f' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-6 py-4"
        style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-white text-lg tracking-tight">
            liveability
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/how-it-works" className="text-xs font-semibold" style={{ color: '#f97316' }}>
              How It Works
            </Link>
            <Link
              href="/auth"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-16">
        {/* Hero */}
        <section className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            Real data, not guesswork.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: '#a0a0a0' }}>
            Liveability shows verified, address-level data on air quality, safety, walkability,
            and nearby amenities for Columbus, Ohio — pulled straight from official sources for
            the exact coordinates of the address you search.
          </p>
        </section>

        {/* Why not just ask AI */}
        <section>
          <h2 className="text-2xl font-black text-white mb-2">Why not just ask AI?</h2>
          <p style={{ color: '#a0a0a0' }} className="text-sm mb-6 max-w-2xl">
            General-purpose chatbots are great for a lot of things, but they're not built to give
            you live, verifiable, address-level data.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
              <div className="flex items-center gap-2 mb-4">
                <Bot size={20} style={{ color: '#a0a0a0' }} />
                <h3 className="text-white font-bold text-sm">AI chatbots</h3>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm" style={{ color: '#a0a0a0' }}>
                <li className="flex items-start gap-2">
                  <X size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  General knowledge, not tied to a specific address
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  Training data can be outdated
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  No source citations for specific numbers
                </li>
                <li className="flex items-start gap-2">
                  <X size={16} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  Can't be independently verified
                </li>
              </ul>
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1a1a', border: '1px solid #f97316' }}>
              <div className="flex items-center gap-2 mb-4">
                <Database size={20} style={{ color: '#f97316' }} />
                <h3 className="text-white font-bold text-sm">Liveability</h3>
              </div>
              <ul className="flex flex-col gap-2.5 text-sm" style={{ color: '#a0a0a0' }}>
                <li className="flex items-start gap-2">
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  Live data for the exact coordinates of your address
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  Pulled from EPA AirNow, OpenStreetMap, and City of Columbus GIS
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  Every number links back to its source
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  Updated continuously
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section>
          <h2 className="text-2xl font-black text-white mb-2">How the data works</h2>
          <p style={{ color: '#a0a0a0' }} className="text-sm mb-6 max-w-2xl">
            Each metric comes from a specific, named source.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {METHODOLOGY.map(m => (
              <div key={m.title} className="rounded-xl p-5 flex gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <m.icon size={24} className="shrink-0" style={{ color: '#f97316' }} />
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">{m.title}</h3>
                  <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Scores */}
        <section>
          <h2 className="text-2xl font-black text-white mb-2">How scores are calculated</h2>
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <div className="flex items-start gap-3">
              <Calculator size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
                <span className="text-white font-semibold">Amenity scores</span> (grocery, transit, parks,
                schools, healthcare, dining, libraries, banks, worship, parking) are based on how many
                of each are found, and how close they are, within the radius you select.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Calculator size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
                <span className="text-white font-semibold">Air quality</span> uses the EPA&apos;s standard
                AQI categories (Good, Moderate, Unhealthy, etc.) to translate the raw AQI number into a score.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Calculator size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
                <span className="text-white font-semibold">Safety score</span> is inverse to incident
                density — fewer reported incidents nearby means a higher score.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Link2 size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
              <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
                Scores are a quick summary, but the underlying raw numbers — counts, distances,
                AQI readings, incident totals — are always visible and clickable for full detail.
              </p>
            </div>
          </div>
        </section>

        {/* Data freshness */}
        <section>
          <h2 className="text-2xl font-black text-white mb-2">Data freshness</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FRESHNESS.map(f => (
              <div key={f.title} className="rounded-xl p-5 flex gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <RefreshCw size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                <div>
                  <h3 className="text-white font-bold text-sm mb-1">{f.title}</h3>
                  <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-2xl font-black text-white mb-2">Privacy</h2>
          <div className="rounded-xl p-5 flex gap-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <Lock size={20} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
            <p style={{ color: '#a0a0a0' }} className="text-sm leading-relaxed">
              Addresses you save are tied to your account only — they&apos;re never shared or sold.
              You can delete any saved address at any time.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} style={{ color: '#f97316' }} />
            <h2 className="text-2xl font-black text-white">FAQ</h2>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {FAQ.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center justify-between text-xs" style={{ color: '#a0a0a0' }}>
          <span>liveability · Columbus, Ohio</span>
          <span>Data: EPA AirNow · OpenStreetMap · City of Columbus GIS</span>
        </div>
      </footer>
    </div>
  )
}
