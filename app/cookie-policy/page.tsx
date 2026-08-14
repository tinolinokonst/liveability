import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Cookie Policy | Liveability",
  description:
    "Liveability sets one cookie — a sign-in session cookie. No analytics, advertising, or tracking cookies.",
};

const ROW_BORDER = "1px solid #2a2a2a";

export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-white">Cookie Policy</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: August 13, 2026</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
          <p>
            Liveability sets <span className="text-white">one cookie</span>, and only after
            you sign in. It keeps you logged in. We use no analytics, advertising, or
            tracking cookies, and we store nothing in your browser&apos;s local storage.
            This policy sits alongside our{" "}
            <Link href="/privacy" className="text-[#f97316] underline">
              Privacy Policy
            </Link>
            .
          </p>

          {/* ── What we set ────────────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">What we store</h2>

            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#1a1a1a", border: ROW_BORDER }}
            >
              <div className="p-4 space-y-2" style={{ borderBottom: ROW_BORDER }}>
                <p className="text-white font-semibold text-sm">
                  <code className="text-[#f97316]">sb-&lt;project&gt;-auth-token</code>
                </p>
                <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-white">Type</dt>
                  <dd>Cookie, first-party (set on our own domain)</dd>
                  <dt className="text-white">Set by</dt>
                  <dd>Supabase, our authentication provider, on our behalf</dd>
                  <dt className="text-white">Purpose</dt>
                  <dd>
                    Keeps you signed in between pages, and lets our server verify it is
                    really you before returning your saved areas
                  </dd>
                  <dt className="text-white">When</dt>
                  <dd>Only once you sign in — browsing the public pages sets nothing</dd>
                  <dt className="text-white">Lifetime</dt>
                  <dd>
                    Lasts for your sign-in session and is refreshed while you stay active;
                    cleared when you sign out
                  </dd>
                  <dt className="text-white">Consent</dt>
                  <dd>
                    Strictly necessary, so no consent is required — the signed-in
                    experience cannot work without it
                  </dd>
                </dl>
                <p className="text-xs pt-1" style={{ color: "#6b6b6b" }}>
                  If the value is large your browser may show it split across numbered
                  parts (<code>…auth-token.0</code>, <code>…auth-token.1</code>). That is
                  one cookie, chunked.
                </p>
              </div>

              <div className="p-4 space-y-1">
                <p className="text-white font-semibold text-sm">
                  Local storage and session storage
                </p>
                <p className="text-sm">
                  Not used. Liveability writes nothing to either. Anything you do in a
                  session — your metric weightings, comparison list, and AI Match results —
                  is held in the page&apos;s memory only and is gone when you reload or
                  close the tab.
                </p>
              </div>
            </div>
          </section>

          {/* ── Third parties ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Third-party content</h2>
            <p>
              Two third-party services load in your browser. We checked both: neither sets
              any cookie.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-white">Google Maps JavaScript API</span> — loaded only
                on the signed-in dashboard, and only to power address autocomplete in the
                search box. It is served from Google&apos;s cookieless API domains
                (<code>maps.googleapis.com</code>, <code>maps.gstatic.com</code>) and sets
                no cookies. See{" "}
                <a
                  href="https://policies.google.com/technologies/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f97316] underline"
                >
                  Google&apos;s cookie policy
                </a>
                .
              </li>
              <li>
                <span className="text-white">CARTO basemap tiles</span> — the map images on
                result pages, requested from <code>basemaps.cartocdn.com</code>. Tile
                requests set no cookies. See{" "}
                <a
                  href="https://carto.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f97316] underline"
                >
                  CARTO&apos;s privacy policy
                </a>
                .
              </li>
            </ul>
            <p>
              Maps are rendered with Leaflet using CARTO tiles — we do not embed a Google
              map, so your browser makes no requests to <code>google.com</code>.
            </p>
          </section>

          {/* ── Not used ───────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we do not use</h2>
            <p>Being specific rather than hiding behind boilerplate — none of these exist:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Analytics cookies or products such as Google Analytics</li>
              <li>Advertising, retargeting, or social media pixels</li>
              <li>Cross-site tracking or device fingerprinting</li>
              <li>Preference cookies</li>
            </ul>
            <p>
              Because we set no non-essential cookies, there is no cookie banner and nothing
              to opt out of.
            </p>
          </section>

          {/* ── Control ────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How to check or clear cookies</h2>
            <p>
              You can inspect exactly what this site stores: open your browser&apos;s
              developer tools and look under <span className="text-white">Application →
              Cookies</span> (Chrome, Edge) or <span className="text-white">Storage</span>{" "}
              (Firefox, Safari).
            </p>
            <p>
              To clear or block: use your browser&apos;s privacy settings, or clear site data
              for this domain. Signing out, or deleting your account from the Settings page,
              also clears the session. If you block the session cookie you can still read the
              public pages, but you will not be able to stay signed in or use saved areas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Changes to this policy</h2>
            <p>
              If we ever add a cookie beyond the one above, we will update this page before
              doing so and, where consent is required, ask for it first.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p>
              Questions about cookies? Reach out at{" "}
              <span className="text-white">tino.rosenkrantz@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
