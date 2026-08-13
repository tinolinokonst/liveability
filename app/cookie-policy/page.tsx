import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Cookie Policy | Liveability",
  description:
    "Liveability uses one strictly necessary cookie to keep you signed in. No analytics or tracking cookies.",
};

export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-white">Cookie Policy</h1>
        <p className="mt-2 text-sm text-[#6b6b6b]">Last updated: August 13, 2026</p>

        <div className="mt-10 space-y-10 text-base leading-relaxed text-[#a0a0a0]">
          <p>
            Short version: Liveability sets one cookie, and only after you sign in.
            It keeps you logged in. There are no analytics, advertising, or tracking
            cookies, and no third-party tracking scripts. This policy should be read
            alongside our{" "}
            <Link href="/privacy" className="text-[#f97316] underline">
              Privacy Policy
            </Link>
            .
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">The cookie we set</h2>
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <p className="text-white font-semibold text-sm">
                Supabase authentication session
              </p>
              <p className="mt-1 text-sm">
                Named <code className="text-[#f97316]">sb-&lt;project&gt;-auth-token</code>{" "}
                (it may be split across a few numbered parts if it is large).
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                <li>
                  <span className="text-white">Purpose:</span> keeps you signed in as you
                  move between pages, and lets our server confirm it is really you before
                  returning your saved addresses.
                </li>
                <li>
                  <span className="text-white">Category:</span> strictly necessary. Under
                  Swiss and EU rules this type of cookie does not require consent, because
                  the Service cannot provide a logged-in experience without it.
                </li>
                <li>
                  <span className="text-white">Set by:</span> Supabase, our authentication
                  provider, on our behalf.
                </li>
                <li>
                  <span className="text-white">When:</span> only once you sign in. Browsing
                  the public pages sets no cookies at all.
                </li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">What we do not use</h2>
            <p>
              We want to be specific rather than hide behind boilerplate. Liveability does
              not use any of the following:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Analytics cookies or products such as Google Analytics</li>
              <li>Advertising, retargeting, or social media pixels</li>
              <li>Cross-site tracking or device fingerprinting</li>
              <li>Preference cookies — your metric weightings are held in the page only and reset when you leave</li>
              <li>Local storage or session storage for tracking purposes</li>
            </ul>
            <p>
              Because we set no non-essential cookies, there is no cookie banner and
              nothing to opt out of.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Your control</h2>
            <p>
              You can block or delete cookies in your browser settings at any time. If you
              block the session cookie you can still browse the public pages, but you will
              not be able to stay signed in or use saved addresses. Signing out, or
              deleting your account from the Settings page, clears the session.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Changes to this policy</h2>
            <p>
              If we ever introduce additional cookies, we will update this page before
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
