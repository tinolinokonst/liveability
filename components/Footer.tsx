import Link from "next/link";

const GENERAL_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
];

const DATA_SOURCES = [
  { label: "Open-Meteo", href: "https://open-meteo.com/" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/" },
  { label: "Google Maps Platform", href: "https://mapsplatform.google.com/" },
  { label: "Rentcast", href: "https://rentcast.io/" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: "#0f0f0f", borderTop: "1px solid #2a2a2a" }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-bold text-white">
              Liveability
            </Link>
            <p className="mt-2 max-w-xs text-sm text-[#a0a0a0]">
              Data-driven quality-of-life scores for cities and addresses
              in Switzerland.
            </p>
          </div>

          {/* General */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              General
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {GENERAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[#a0a0a0] transition-colors hover:text-[#f97316]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Data Sources
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {DATA_SOURCES.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#a0a0a0] transition-colors hover:text-[#f97316]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-10 pt-6 text-sm text-[#a0a0a0]"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          &copy; {year} Liveability. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
