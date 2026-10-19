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
        <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: October 18, 2026</p>

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
            <p>
              If you turn on <strong className="text-white">construction watch</strong> for a
              saved address, we store that the watch is on, when we last emailed you about
              it, and a random token used only for its unsubscribe link. Once a day we check
              building-permit notices published in the cantonal official gazettes, and if one
              is within 300 m of a watched address we email you once about it at your
              account email address — what was filed, how far away, and a link to the
              official notice. We record which permits we have emailed you about so you never
              get the same one twice. The permit details we keep are only the project type,
              the address of the works, the publication date and the link to the notice; the
              notices name the applicants, but we never store or show those names. Permit
              records are deleted after about a year, when the gazettes take the notices
              down. We use your email for these alerts only — no newsletters, nothing
              shared. Every alert has a one-click link to stop watching that address, and you
              can switch any watch off in your saved addresses at any time.
            </p>
            <p>
              If you send feedback from the dashboard, we store your message, the part
              of the dashboard you sent it from, the time, and your account ID so we can
              follow up. Only we can read it — it is not visible to other users, and you
              cannot edit it after sending.
            </p>
            <p>
              If you enter your household income, marital status and household size for
              the Monthly Budget, they stay in your browser tab (session storage, deleted
              when you close the tab). We never save them to our database or with your
              saved addresses, and never log them. To calculate income tax, your income
              rounded to the nearest CHF 5,000 is sent — with the commune, marital status
              and number of children, but nothing that identifies you — to the Swiss
              Federal Tax Administration&apos;s public tax calculator. Its answer is cached
              for up to 30 days so others in the same bracket and commune get it without
              a new request; that cache holds no account or other personal link.
            </p>
            <p>
              If you join the US launch waitlist, we store your email address, the US
              city and state you are moving to, anything you write under &ldquo;What
              matters most to you?&rdquo;, the time, and the country your request came
              from (taken from your IP address by our host, Vercel). You do not need an
              account to join. We use your email for one purpose only: to tell you when
              Liveability launches in the US. It is never shared with anyone, never
              added to other mailing lists, and is readable only by us. To be removed,
              email us at the address below and we will delete your entry.
            </p>
            <p>
              We use Vercel Web Analytics to count page views in aggregate. It records
              the page visited, the referring site, and your country, browser, and
              device type. It sets no cookies, writes nothing to your browser, and is
              not linked to your account; Vercel identifies a visit using a hash of the
              request that is discarded within 24 hours. When someone joins the US
              waitlist we also count that signup with the city and state chosen — never
              the email address.
            </p>
            <p>
              To improve the product we use{" "}
              <a
                href="https://posthog.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f97316] underline"
              >
                PostHog
              </a>
              , hosted in its EU cloud (Frankfurt). It records which pages you visit and a
              fixed set of product events — for example that a search finished, a metric
              was opened, the amenity radius changed, an address was saved, or a comparison
              was viewed. Those events carry no personal data: never the address you
              searched, your email, or any income or household value. If you are signed
              in, events are linked to your account&apos;s internal ID (not your email) so we
              can see how one person moves through the product. PostHog also records
              session replays — a reconstruction of how the page changed while you used
              it. In replays every text field is masked, the income field is not recorded
              at all, the text of the Monthly Budget and of AI Match answers is masked, and
              request contents are not captured, so your income is never captured in any
              form. PostHog runs cookieless: it sets no cookies and writes nothing to your
              browser&apos;s storage, so a new visit starts anonymous. If your browser
              sends Do Not Track, PostHog records nothing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Cookies</h2>
            <p>
              We set one cookie: the authentication session cookie created by Supabase
              when you sign in. It is strictly necessary to keep you signed in, and no
              cookie is set at all until you do. We do not use analytics, advertising,
              or tracking cookies, and we write nothing to your browser&apos;s local
              storage. The only other things kept in your browser are the Monthly Budget
              household you enter and, if you dismiss the US waitlist banner, a flag
              to keep it hidden — both in the tab&apos;s session storage.
            </p>
            <p>
              Three third-party services load in your browser — the Google Maps
              JavaScript API (on the signed-in dashboard, for address autocomplete),
              map tiles from the Swiss Federal Office of Topography (swisstopo) for the
              maps on Swiss result pages, and map tiles from the USGS National Map for
              maps of US addresses. We verified that none of them sets cookies. See our{" "}
              <Link href="/cookie-policy" className="text-[#f97316] underline">
                Cookie Policy
              </Link>{" "}
              for the full detail.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How we use your information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide and operate the Service, including generating scores</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Apply per-account rate limits so the Service stays available (and, for
                the account-free US waitlist, a per-IP limit stored only as a keyed hash)</li>
              <li>Understand, in aggregate, which pages are used, to improve them</li>
              <li>
                Study how people use the product, through PostHog events and session
                replays, to find and fix what is confusing
              </li>
              <li>Read the feedback you send, and respond to your questions or requests</li>
              <li>Email you once about the US launch, if you joined the waitlist</li>
              <li>Email you about new building permits near addresses you chose to watch</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we do not do</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>We do not sell your personal information.</li>
              <li>We do not run ads or share data with ad networks.</li>
              <li>
                We do not track you across sites, and our analytics is used only to
                improve the product — never for advertising or profiling. Both Vercel
                Web Analytics and PostHog run without cookies, as described above.
              </li>
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
              <li>
                geodienste.ch (the cantons&apos; shared geodata platform) — cantonal hazard
                maps and cadastres of contaminated sites, for the Risks section
              </li>
              <li>
                geo.admin.ch — the federal cadastres of contaminated sites for railway,
                civil airfield and military land, and swisstopo&apos;s address search to
                place building-permit notices on the map
              </li>
              <li>
                amtsblattportal.ch (operated by SECO) — building-permit notices from the
                cantonal official gazettes, for construction watch. We only read from it;
                nothing about you is sent.
              </li>
              <li>
                For US addresses: the US Census Bureau (census geographies), AirNow and the
                EPA Air Quality System (air quality), the National Weather Service (alerts
                and heat), the Bureau of Transportation Statistics (noise), the National
                Laboratory of the Rockies (sunlight), FEMA (flood zones and the National
                Risk Index, including wildfire), and the EPA
                Facility Registry Service (Superfund, brownfield and toxic-release sites)
              </li>
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
            <p>
              If you have entered a Monthly Budget household, AI Match also sends the
              budget estimates derived from it for each area (monthly tax, health
              insurance, social contributions, rent and what is left over) so it can
              answer questions about tax and take-home pay. Your income itself is not
              included in that request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">How we share information</h2>
            <p>
              We do not sell your personal information. We rely on service providers
              to operate the Service — Vercel for hosting and analytics, Supabase for authentication
              and database, PostHog (EU) for product analytics and session replays,
              Resend for sending construction-watch emails (it receives your email address
              and the alert&apos;s content), and Anthropic for the AI Match feature — and they may
              process information on our behalf. We may also disclose information
              where required by law, to enforce our terms, or to protect the rights
              and safety of our users or the public.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Your choices and rights</h2>
            <p>
              You can delete your account at any time from the Settings page, which
              removes your saved addresses, any feedback you sent, and your account
              data, including your construction watches and the record of alerts we sent
              you. To stop a single watch, use the link in any alert or the switch on
              the saved address. To leave the US waitlist, email us and we will delete your entry.
              You can also request
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
              Service or as required by law. PostHog events and session replays are kept
              according to our PostHog plan&apos;s retention period and then deleted, and
              you can ask us to delete those linked to your account. Saved addresses are readable only by the
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
