import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Liveability",
  description:
    "How Liveability uses cookies and similar technologies, and the choices you have.",
};

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 19, 2026</p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-gray-700">
        <p>
          This Cookie Policy explains how Liveability (&ldquo;we,&rdquo;
          &ldquo;us&rdquo;) uses cookies and similar technologies when you visit
          our Service. It should be read alongside our{" "}
          <a
            href="/privacy-policy"
            className="font-medium text-blue-600 underline"
          >
            Privacy Policy
          </a>
          .
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            What Are Cookies?
          </h2>
          <p>
            Cookies are small text files placed on your device when you visit a
            website. They are widely used to make sites work, to keep you signed
            in, to remember your preferences, and to help site owners understand
            how their site is used. We also use similar technologies such as
            local storage, which work in a comparable way. In this policy, we
            refer to all of these as &ldquo;cookies.&rdquo;
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Categories of Cookies We Use
          </h2>

          <h3 className="text-lg font-semibold text-gray-900">
            Strictly Necessary
          </h3>
          <p>
            These cookies are required for the Service to function and cannot be
            switched off. They are used to keep you signed in, secure your
            session, and route traffic. Because they are essential, they do not
            require your consent. Authentication is handled by our provider
            Supabase, and hosting is provided by Vercel.
          </p>

          <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>
          <p>
            These cookies remember choices you make, such as how you weight
            different livability metrics, so your experience is consistent
            across visits. Where these are not essential to the core function of
            the Service, we set them only with your consent.
          </p>

          <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
          <p>
            These cookies help us understand how visitors use the Service so we
            can improve it, for example by measuring which pages are visited and
            how the search and comparison features are used. We set analytics
            cookies only with your consent, and the data they collect is used in
            aggregate.
          </p>

          <h3 className="text-lg font-semibold text-gray-900">
            Third-Party Map and Location Services
          </h3>
          <p>
            We use Google Maps to provide geocoding and map features. Google may
            set its own cookies when these features load. We do not control
            these cookies, and they are governed by Google&apos;s own policies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Cookies in Detail
          </h2>
          <p>
            The table below lists the main cookies we use. Specific names and
            durations may change as the Service evolves.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-2 pr-4 font-semibold text-gray-900">
                    Cookie
                  </th>
                  <th className="py-2 pr-4 font-semibold text-gray-900">
                    Provider
                  </th>
                  <th className="py-2 pr-4 font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="py-2 pr-4 font-semibold text-gray-900">
                    Purpose
                  </th>
                  <th className="py-2 font-semibold text-gray-900">Duration</th>
                </tr>
              </thead>
              <tbody className="align-top text-gray-700">
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">
                    sb-access-token
                  </td>
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">Strictly necessary</td>
                  <td className="py-2 pr-4">
                    Keeps you signed in to your account
                  </td>
                  <td className="py-2">Session / ~1 hour</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">
                    sb-refresh-token
                  </td>
                  <td className="py-2 pr-4">Supabase</td>
                  <td className="py-2 pr-4">Strictly necessary</td>
                  <td className="py-2 pr-4">
                    Renews your session so you stay signed in
                  </td>
                  <td className="py-2">~30 days</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">
                    liveability-prefs
                  </td>
                  <td className="py-2 pr-4">Liveability</td>
                  <td className="py-2 pr-4">Preferences</td>
                  <td className="py-2 pr-4">
                    Remembers your metric weightings and settings
                  </td>
                  <td className="py-2">~1 year</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">_ga</td>
                  <td className="py-2 pr-4">Google Analytics</td>
                  <td className="py-2 pr-4">Analytics</td>
                  <td className="py-2 pr-4">
                    Distinguishes unique visitors
                  </td>
                  <td className="py-2">~2 years</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4 font-mono text-xs">_ga_*</td>
                  <td className="py-2 pr-4">Google Analytics</td>
                  <td className="py-2 pr-4">Analytics</td>
                  <td className="py-2 pr-4">
                    Maintains session state for analytics
                  </td>
                  <td className="py-2">~2 years</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500">
            Note: This list reflects the cookies we expect to use based on our
            current setup. Always verify against the cookies actually set on the
            live Service and update this table accordingly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Choices
          </h2>
          <p>
            When you first visit the Service, you can choose which non-essential
            cookies to allow through our consent banner. You can change or
            withdraw your choice at any time by reopening your cookie settings.
            Strictly necessary cookies cannot be disabled because the Service
            cannot function without them.
          </p>
          <p>
            You can also control cookies through your browser settings,
            including blocking or deleting them. Be aware that disabling some
            cookies may affect how the Service works, including keeping you
            signed in.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Changes to This Policy
          </h2>
          <p>
            We may update this Cookie Policy from time to time as the Service or
            applicable law changes. Changes are effective when posted here.
            Please revisit this page periodically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
          <p>
            If you have questions about our use of cookies, please contact us.
          </p>
        </section>
      </div>
    </main>
  );
}
