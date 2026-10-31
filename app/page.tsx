import type { Metadata } from "next";
import HomePage from "@/components/HomePage";
import { coverageName, pageMetadata } from "@/lib/seo";

// A function rather than a constant so the coverage follows US_ENABLED
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/",
    title: "Liveability — Find where to live",
    description: `Address-level scores for air quality, walkability, transit, safety, schools, natural hazards and monthly costs, from official public data. Currently available for ${coverageName()}.`,
  });
}

export default function Home() {
  return <HomePage />;
}
