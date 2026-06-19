import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Liveability",
  description:
    "How Liveability collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 19, 2026</p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-gray-700">
        <p>
          This privacy policy explains how Liveability (&ldquo;we,&rdquo;
          &ldquo;us&rdquo;) collects, uses, and protects your information, and
          the choices you have. We take your privacy seriously and collect
          personal information only with your knowledge and consent.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Information We Collect
          </h2>
          <p>
            When you create an account or use the Service, we may collect
            information you provide directly, such as your name and email
            address. Account creation and authentication are handled through our
            third-party provider, Supabase, which stores your credentials
            securely on our behalf.
          </p>
          <p>
            We also collect the addresses and neighborhoods you search so we can
            return livability scores. We may collect technical information about
            your device and usage, including your IP address, browser type, time
            of visit, and pages viewed. We use cookies and similar technologies
            to keep you signed in and to remember your preferences, such as how
            you weight different livability metrics.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            How We Use Your Information
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Provide and operate the Service, including generating scores</li>
            <li>Authenticate your account and keep it secure</li>
            <li>Remember your settings and personalize your results</li>
            <li>Understand how the Service is used so we can improve it</li>
            <li>Respond to your questions or requests</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Third-Party Data Sources
          </h2>
          <p>
            To generate livability scores, Liveability sends location queries
            (such as an address or coordinates) to third-party and public data
            providers, including Google Maps for geocoding, the EPA AirNow
            program, PurpleAir, OpenStreetMap, the U.S. Census Bureau, and FBI
            crime data via data.gov. These queries are about locations, not about
            you personally. Each provider operates under its own privacy policy,
            which we do not control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            How We Share Information
          </h2>
          <p>
            We do not sell your personal information. We use service providers,
            such as our hosting platform (Vercel) and authentication and
            database provider (Supabase), to operate the Service, and they may
            process your information on our behalf. We may also disclose
            information when required by law, to enforce our terms, or to protect
            the safety and rights of our users or the public.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
          <p>
            We may use analytics tools to understand how people use the Service.
            These tools may collect aggregated usage information that does not
            directly identify you. Where we use a tool such as Google Analytics,
            its use of information is governed by Google&apos;s own privacy policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Your Choices</h2>
          <p>
            You can request access to, correction of, or deletion of your
            personal information by contacting us. You can control cookies
            through your browser settings, though some features may not work
            without them. If you have chosen to receive updates from us, you can
            opt out at any time. Depending on where you live, including the EU,
            Switzerland, and certain U.S. states, you may have additional rights
            over your personal data, and we will honor applicable legal
            requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Data Retention and Security
          </h2>
          <p>
            We retain personal information only as long as needed to provide the
            Service or as required by law. We rely on reputable providers to
            store data securely, but no method of transmission or storage is
            completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Children&apos;s Privacy
          </h2>
          <p>
            Liveability is intended for adults and is not directed at children.
            We do not knowingly collect personal information from children.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. Changes are
            effective when posted here. Please revisit this page periodically so
            you are aware of any changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
          <p>
            If you have questions about this privacy policy or how we handle
            your information, please contact us.
          </p>
        </section>
      </div>
    </main>
  );
}
