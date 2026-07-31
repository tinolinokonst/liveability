import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of Use | Liveability",
  description: "The terms that apply to your use of Liveability.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Use</h1>
      <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: June 2026</p>

      <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Use of the service</h2>
          <p>
            Liveability is provided for informational purposes only. By using
            the service you agree to these terms. We may update them at any time
            by posting a revised version here — continued use means you accept
            the update.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Data accuracy</h2>
          <p>
            Scores and data on Liveability are sourced from third-party and
            public APIs. That data may be incomplete, delayed, or unavailable
            for a given location. We make no warranty that scores are accurate
            or up to date, and we are not responsible for errors in source data.
          </p>
          <p>
            Do not use Liveability as the sole basis for major decisions such as
            purchasing a home or signing a long-term lease. Always independently
            verify the facts that matter most to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">No professional advice</h2>
          <p>
            Nothing on Liveability constitutes real estate, legal, financial, or
            environmental advice. Consult a qualified professional before making
            significant decisions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Limitation of liability</h2>
          <p>
            The service is provided &ldquo;as is&rdquo; without warranty of any
            kind. To the fullest extent permitted by law, Liveability and its
            operators are not liable for any damages arising from your use of or
            reliance on the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p>
            Questions? Reach out at{" "}
            <span className="text-white">tino.rosenkrantz@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
    </>
  );
}
