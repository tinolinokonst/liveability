import Link from 'next/link'

const FEATURES = [
  { icon: '💨', label: 'Air Quality', desc: 'Real-time AQI from Open-Meteo' },
  { icon: '🚶', label: 'Walkability', desc: 'Amenities within 800m radius' },
  { icon: '🌿', label: 'Green Space', desc: 'Parks and nature access' },
  { icon: '🛒', label: 'Grocery Access', desc: 'Supermarkets and stores nearby' },
  { icon: '🚌', label: 'Transit Access', desc: 'Bus stops and transit stations' },
  { icon: '🏘️', label: 'Neighborhood Scores', desc: '10 Columbus neighborhoods ranked' },
]

export default function Home() {
  return (
    <main style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="text-white font-bold text-lg tracking-tight">liveability</span>
        <div className="flex gap-3">
          <Link
            href="/auth"
            className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ color: '#a0a0a0' }}
          >
            Log in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm px-4 py-2 rounded-lg font-semibold text-white transition-colors"
            style={{ backgroundColor: '#f97316' }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: '#f973161a', color: '#f97316', border: '1px solid #f9731633' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
            Columbus, Ohio · Free to use
          </div>

          <h1 className="text-5xl sm:text-6xl font-black text-white leading-none mb-6 tracking-tight">
            Find your perfect<br />
            <span style={{ color: '#f97316' }}>Columbus</span><br />
            neighborhood.
          </h1>

          <p className="text-lg mb-10 leading-relaxed" style={{ color: '#a0a0a0' }}>
            Rent is one number. Your quality of life is five.
            Air, walkability, green space, grocery access, transit —
            we surface what listing sites hide.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth?mode=signup"
              className="px-8 py-4 rounded-xl font-bold text-white text-base text-center transition-all hover:opacity-90"
              style={{ backgroundColor: '#f97316' }}
            >
              Start exploring for free
            </Link>
            <Link
              href="/auth"
              className="px-8 py-4 rounded-xl font-semibold text-sm text-center transition-all"
              style={{ backgroundColor: '#1a1a1a', color: '#a0a0a0', border: '1px solid #2a2a2a' }}
            >
              Already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <p style={{ color: '#a0a0a0' }} className="text-xs font-semibold uppercase tracking-widest mb-8">
          What we measure
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="rounded-xl p-5"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="text-white font-semibold text-sm mb-1">{f.label}</p>
              <p style={{ color: '#a0a0a0' }} className="text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <h2 className="text-3xl font-black text-white mb-4">Ready to find home?</h2>
          <p style={{ color: '#a0a0a0' }} className="mb-8">
            Search any Columbus address or browse neighborhood rankings — free.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-block px-10 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#f97316' }}
          >
            Get started free
          </Link>
        </div>
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
