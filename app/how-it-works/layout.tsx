import type { Metadata } from "next";
import { coverageName, pageMetadata } from "@/lib/seo";

// The page itself is a client component, so its metadata lives here
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/how-it-works",
    title: "How It Works | Liveability",
    description: `Where every Liveability number comes from: the official sources we use for ${coverageName()}, how often they update, and how the Liveability Score is calculated.`,
  });
}

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
