import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy | Liveability",
  description:
    "How Liveability collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: August 13, 2026</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
          <p>
            This policy explains how Liveability (&ldquo;we,&rdquo; &ldquo;us&rdquo;)
            collects, uses, and protects your information, and the choices you have.
            We collect personal information only with your knowledge, and we keep it
            to the minimum the Service needs to work.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we collect</h2>
            <p>
              When you create an account, we store your email address via{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f97316] underline"
              >
                Supabase Auth
              </a>
              . Supabase handles credential storage and authentication — we never see
              or store your password directly.
            </p>
            <p>
              If you save addresses, those addresses and their liveability scores at
              the time of saving are stored in our database and associated with your
              account. We also record basic server logs (request timestamps, IP
              addresses) as part of normal hosting operations via Vercel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Cookies</h2>
            <p>
              We use a single category of cookie: the authentication session cookie
              set by Supabase when you sign in. It is strictly necessary to keep you
              signed in, and no cookie is set at all until you do. We do not use
              analytics, advertising, or tracking cookies, and we do not load
              third-party tracking scripts. See our{" "}
              <Link href="/cookie-policy" className="text-[#f97316] underline">
                Cookie Policy
              </Link>{" "}
              for detail.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How we use your information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide and operate the Service, including generating scores</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Apply per-account rate limits so the Service stays available</li>
              <li>Respond to your questions or requests</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we do not do</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>We do not sell your personal information.</li>
              <li>We do not run ads or share data with ad networks.</li>
              <li>We do not use analytics or behavioural tracking tools.</li>
              <li>
                We do not store the full details of every address you search — only
                addresses you explicitly save.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Third-party data sources</h2>
            <p>
              To generate liveability scores, we send location coordinates (not your
              personal information) to public and third-party data providers:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Swiss Federal Office for the Environment (BAFU) — air quality and sonBASE noise data</li>
              <li>Federal Office of Topography swisstopo — commune boundaries</li>
              <li>Swiss Federal Statistical Office (FSO) — canton-level crime statistics</li>
              <li>transport.opendata.ch — public transport stations and departures</li>
              <li>OpenStreetMap — nearby amenities</li>
              <li>Google Maps Platform — geocoding and rooftop sunlight modelling</li>
            </ul>
            <p>
              These queries are about locations, not about you personally. Each
              provider operates under its own privacy policy, which we do not control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">AI Match</h2>
            <p>
              If you use the AI Match feature, the lifestyle description you write is
              sent to Anthropic&apos;s API to generate area recommendations. Send only
              what you are comfortable sharing — avoid including sensitive personal
              details. We do not attach your name or email to that request, and the
              text is not used to train models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How we share information</h2>
            <p>
              We do not sell your personal information. We rely on service providers
              to operate the Service — Vercel for hosting, Supabase for authentication
              and database, and Anthropic for the AI Match feature — and they may
              process information on our behalf. We may also disclose information
              where required by law, to enforce our terms, or to protect the rights
              and safety of our users or the public.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Your choices and rights</h2>
            <p>
              You can delete your account at any time from the Settings page, which
              removes your saved addresses and account data. You can also request
              access to, correction of, or deletion of your personal information by
              contacting us. You can control cookies through your browser settings,
              though you will not be able to stay signed in without the session
              cookie. Depending on where you live — including under the Swiss Federal
              Act on Data Protection and the EU GDPR — you may have additional rights
              over your personal data, and we will honour applicable legal
              requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Data retention and security</h2>
            <p>
              We retain personal information only as long as needed to provide the
              Service or as required by law. Saved addresses are readable only by the
              account that created them, enforced at the database level. We rely on
              reputable providers to store data securely, but no method of
              transmission or storage is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Children&apos;s privacy</h2>
            <p>
              Liveability is intended for adults and is not directed at children. We
              do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Changes take effect when
              posted here, and the &ldquo;last updated&rdquo; date above will change.
              Please revisit this page periodically.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p>
              Questions about this policy? Reach out at{" "}
              <span className="text-white">tino.rosenkrantz@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
