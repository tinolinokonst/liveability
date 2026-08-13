import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of Use | Liveability",
  description:
    "The terms and conditions that apply to your access to and use of Liveability.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Use</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: August 13, 2026</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Terms and conditions</h2>
            <p>
              These terms apply to your access to and use of Liveability (the
              &ldquo;Service,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) and the
              information and features available through it. By using Liveability you
              agree to comply with these terms, creating a legally binding agreement
              between you and Liveability. We may change these terms at any time and
              will post the updated version here. Continued use after a change means
              you accept it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">General disclaimer</h2>
            <p>
              Liveability is provided for informational purposes only. Before you act
              on any information you find here, independently confirm any facts that
              are important to your decision, including facts about a specific address
              or area. If you rely on information or scores from Liveability, you do so
              at your own risk and are solely responsible for any resulting loss.
            </p>
            <p>
              All content is provided on an &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; basis. Our scores are estimates generated from
              third-party and public data sources, and that data may be incomplete,
              delayed, or unavailable for a given location. Where data is missing,
              estimates or omissions may occur. We make no warranties of any kind,
              express or implied, about the operation of the Service or the accuracy
              of the information, scores, or materials it contains. To the fullest
              extent permitted by law, we disclaim all warranties, including implied
              warranties of merchantability and fitness for a particular purpose.
            </p>
            <p>
              Do not use Liveability as the sole basis for major decisions such as
              purchasing a home or signing a long-term lease.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Not professional advice</h2>
            <p>
              Liveability does not provide real estate, legal, financial, medical, or
              environmental advice. Scores related to air quality, noise, safety, or
              any other metric are not a substitute for professional inspection or
              advice. Decisions about where to live are yours alone.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Limited right to use</h2>
            <p>
              Liveability and the materials available through it are protected by
              applicable copyright and other intellectual property laws. You may use
              the Service for personal, non-commercial use only. You may not copy,
              reproduce, modify, republish, scrape, upload, post, distribute, or
              transmit any materials from the Service without our prior written
              consent. Liveability is intended for a general adult audience and is not
              designed for children. We are not responsible for access or use of the
              Service by children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Your account</h2>
            <p>
              Access to account-protected areas is restricted to registered users. You
              agree to provide accurate, current information when you register. You are
              responsible for maintaining the confidentiality of your account and
              password and for all activity that occurs under your account. You will
              not share your credentials, misrepresent your identity, or impersonate
              any person or entity. Authentication is handled through a third-party
              provider (Supabase), and your use of it is also subject to that
              provider&apos;s terms.
            </p>
            <p>
              We apply per-account rate limits to keep the Service available. You agree
              not to circumvent them, or to access the Service through automated means
              beyond ordinary personal use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">User communications</h2>
            <p>
              Any comments or feedback you submit to Liveability will be treated as
              non-confidential. You agree not to submit anything unlawful, abusive,
              defamatory, harassing, obscene, or otherwise objectionable, or anything
              that infringes the rights of others. You are solely responsible for the
              content you submit, and we may remove content that does not meet these
              terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Third-party data and links</h2>
            <p>
              Liveability relies on data from third-party and public sources, including
              the Swiss Federal Office for the Environment (BAFU), the Federal Office of
              Topography swisstopo, the Swiss Federal Statistical Office,
              transport.opendata.ch, OpenStreetMap, and Google Maps Platform. The AI
              Match feature is powered by Anthropic. We do not control these sources and
              are not responsible for the accuracy, completeness, or availability of
              their data. The Service may also contain links to third-party sites we do
              not operate; we are not responsible for their content, and such links are
              provided only as a convenience.
            </p>
            <p>
              Geodata is used under the terms of its respective providers. Source:
              Federal Office of Topography swisstopo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Trademarks</h2>
            <p>
              The Liveability name, logo, and related marks are our property. You have
              no right to use them without our prior written consent. Other trademarks
              appearing on the Service are the property of their respective owners.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Indemnity</h2>
            <p>
              You agree to indemnify, defend, and hold Liveability harmless from any
              third-party claims, liabilities, damages, losses, or expenses arising out
              of or connected to your access to and use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Liveability and its suppliers,
              partners, and affiliates will not be liable for any direct, indirect,
              incidental, or consequential damages, including lost revenue or loss of
              data, arising out of your use of or inability to use the Service, or out
              of reliance on the information or scores it provides, even if we have
              been advised of the possibility of such damages.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p>
              Questions about these terms? Reach out at{" "}
              <span className="text-white">tino.rosenkrantz@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
