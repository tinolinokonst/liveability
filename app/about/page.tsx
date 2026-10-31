import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { usEnabled } from "@/lib/flags";
import { coverageName, pageMetadata } from "@/lib/seo";

// A function rather than a constant so the coverage follows US_ENABLED
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/about",
    title: "About | Liveability",
    description: `Learn what Liveability is, who it's for, and how it scores areas and addresses in ${coverageName()}.`,
  });
}

export default function AboutPage() {
  const us = usEnabled();
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-white">About Liveability</h1>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-[#a0a0a0]">
        <p>
          Liveability helps people figure out where to live by scoring
          areas and specific addresses on the things that actually shape
          daily life — not just rent. We currently cover {coverageName()}, and we pull
          data that is usually scattered across a dozen sites into one
          place: air quality, noise, walkability, green space, transit access,
          sunlight, grocery access, and safety{us ? ", plus natural hazards and a monthly budget" : ""}.
        </p>

        <p>
          Most tools show you a price or show you a score. They rarely connect
          the two. Liveability is built around the idea of quality of life per
          dollar, so you can see not just how good an area is, but how much
          quality of life you get for what you pay. That framing is designed for
          families who are price-conscious but still want a data-driven view of
          where they are moving.
        </p>

        <p>
          When you search an address, Liveability pulls together multiple live
          data sources and combines them into a weighted overall score. You can
          adjust the weighting to match your priorities — a household that cares
          most about clean air and quiet streets will see different results than
          one that prioritizes transit and grocery access.
        </p>

        <p>
          We pull from public, authoritative sources wherever possible. In
          Switzerland: the Federal Office for the Environment (BAFU) for air
          quality and road noise, the Federal Office of Topography swisstopo for
          commune boundaries, the Federal Statistical Office for crime
          statistics, and Google&apos;s Solar and Maps platforms for sunlight and
          geocoding.{us && (
            <>
              {" "}In the United States: the EPA and AirNow for air quality and
              pollution sites, the Census Bureau for geocoding and community
              figures, FEMA for flood zones and natural hazards, the Bureau of
              Transportation Statistics for noise, the FBI for crime rates, and
              HUD for rents.
            </>
          )}{" "}OpenStreetMap covers walkability and amenities
          {us ? " in both countries" : ""}. Where data is unavailable or
          incomplete, we say so rather than guess.
        </p>

        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          Liveability is a tool to inform your decision, not make it for you.
          Always confirm the facts that matter most to you before signing a
          lease or buying a home.
        </p>
      </div>
    </div>
    </>
  );
}
