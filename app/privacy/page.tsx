import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy | Liveability",
  description: "What data Liveability collects and how it is used.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: June 2026</p>

      <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
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
            . Supabase handles credential storage and authentication — we never
            see or store your password directly.
          </p>
          <p>
            If you save addresses, those saved addresses (and their liveability
            scores at the time of saving) are stored in our database and
            associated with your account. We also record basic server logs
            (request timestamps, IP addresses) as part of normal hosting
            operations via Vercel.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What we do not do</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We do not sell your data to third parties.</li>
            <li>We do not run ads or share data with ad networks.</li>
            <li>
              We do not store the full details of every address you search —
              only addresses you explicitly save.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Third-party data providers</h2>
          <p>
            To generate liveability scores, we send location coordinates (not
            your personal information) to public and third-party data APIs,
            including Swiss federal geodata services (BAFU, swisstopo, FSO),
            transport.opendata.ch, OpenStreetMap, and Google Maps (geocoding). Each provider operates under its own
            privacy policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your choices</h2>
          <p>
            You can delete your account at any time from the Settings page, which
            removes your saved addresses and account data. To request a copy of
            your data or ask questions about privacy, contact us at the address
            below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p>
            Questions about this policy? Reach out at{" "}
            <span className="text-white">tinolind066@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
    </>
  );
}
