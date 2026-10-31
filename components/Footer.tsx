import Link from "next/link";
import { useFeatureFlags } from "./FeatureFlags";
import { RADON_ATTRIBUTION, RADON_INFO_URL } from "@/lib/radon";

const GENERAL_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Terms of Use", href: "/terms" },
];

const DATA_SOURCES = [
  { label: "BAFU (Federal Office for the Environment)", href: "https://www.bafu.admin.ch/" },
  { label: "swisstopo (Federal Office of Topography)", href: "https://www.swisstopo.admin.ch/" },
  { label: "FSO (Federal Statistical Office)", href: "https://www.bfs.admin.ch/" },
  { label: "transport.opendata.ch", href: "https://transport.opendata.ch/" },
  { label: "OpenStreetMap", href: "https://www.openstreetmap.org/" },
  { label: "Google Maps Platform", href: "https://mapsplatform.google.com/" },
];

const USGS_NATIONAL_MAP_URL = "https://www.usgs.gov/programs/national-geospatial-program/national-map";

// Added while US coverage is on
const US_DATA_SOURCES = [
  { label: "US Census Bureau", href: "https://www.census.gov/" },
  { label: "US EPA (AirNow, AQS, Envirofacts, Smart Location)", href: "https://www.epa.gov/" },
  { label: "NOAA National Weather Service", href: "https://www.weather.gov/" },
  { label: "FEMA (Flood maps, National Risk Index)", href: "https://www.fema.gov/" },
  { label: "HUD Fair Market Rents", href: "https://www.huduser.gov/portal/datasets/fmr.html" },
  { label: "FBI Crime Data Explorer", href: "https://cde.ucr.cjis.gov/" },
  { label: "CDC (PLACES, Social Vulnerability Index)", href: "https://www.cdc.gov/places/" },
  { label: "NCES, USDA ERS, FCC, BTS, NLR", href: "/how-it-works" },
  { label: "Opportunity Insights (Opportunity Atlas)", href: "https://www.opportunityatlas.org/" },
  { label: "USGS The National Map (US map tiles)", href: USGS_NATIONAL_MAP_URL },
];

export default function Footer() {
  const year = new Date().getFullYear();
  // FOPH's radon attribution, verbatim, only while the radon feature is on
  const { radon, us } = useFeatureFlags();
  const dataSources = [
    ...DATA_SOURCES,
    ...(radon ? [{ label: RADON_ATTRIBUTION, href: RADON_INFO_URL }] : []),
    ...(us ? US_DATA_SOURCES : []),
  ];

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
              in Switzerland{us ? " and the United States" : ""}.
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
              {dataSources.map(({ label, href }) => (
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
          className="mt-10 pt-6 flex flex-col gap-1 text-sm text-[#a0a0a0]"
          style={{ borderTop: "1px solid #2a2a2a" }}
        >
          <span>&copy; {year} Liveability. All rights reserved.</span>
          <span className="text-xs">
            Geodata — Source: Federal Office of Topography swisstopo
          </span>
          {us && (
            <span className="text-xs">
              US map tiles — Source:{" "}
              <a
                href={USGS_NATIONAL_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#f97316]"
              >
                USGS The National Map
              </a>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
