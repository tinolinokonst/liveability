import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Liveability",
  description:
    "Learn what Liveability is and how it helps families evaluate neighborhoods and addresses in Columbus, Ohio on quality-of-life metrics beyond rent.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">About Us</h1>

      <section className="mt-8 space-y-6 text-base leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">What is Liveability?</h2>

        <p>
          Liveability helps people figure out where to live by scoring
          neighborhoods and specific addresses on the things that actually shape
          daily life, not just rent. We focus on Columbus, Ohio, and we build
          our scores from data that is usually hard to access or scattered
          across a dozen government sites: air quality, noise, walkability,
          green space, transit access, sunlight, grocery access, and safety.
        </p>

        <p>
          The core idea is simple. Most tools show you a price or show you a
          score. They rarely connect the two. Liveability is built around
          &ldquo;total quality of life per dollar,&rdquo; so you can see not
          just how good an area is, but how much quality of life you get for
          what you pay. That framing is meant for families who are financially
          constrained but still want a data-driven view of where they are
          moving.
        </p>

        <p>
          When you search an address or neighborhood, Liveability pulls together
          multiple live data sources and combines them into a weighted score.
          You can adjust the weighting to match what matters most to you. A
          family that cares about clean air and quiet streets will see different
          results than one that prioritizes transit and grocery access.
        </p>

        <p>
          We pull from public, authoritative sources wherever possible,
          including the U.S. Census Bureau, the EPA AirNow program, PurpleAir
          sensors for hyperlocal air quality, OpenStreetMap for walkability, and
          FBI crime data via data.gov. Where data is unavailable or incomplete,
          we say so rather than guess.
        </p>

        <p>
          Liveability is a tool to inform your decision, not make it for you.
          Always confirm the facts that matter most to you before you sign a
          lease or buy a home.
        </p>
      </section>
    </main>
  );
}
