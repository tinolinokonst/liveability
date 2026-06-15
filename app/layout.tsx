import type { Metadata } from "next";
import "./globals.css";
import TransitionWrapper from "@/components/TransitionWrapper";

export const metadata: Metadata = {
  title: "Liveability — Find your perfect neighborhood",
  description:
    "Browse neighborhood rankings and address-level scores for air quality, walkability, green space, grocery access, and transit. Currently available for Columbus, OH.",
  openGraph: {
    title: "Liveability — Find your perfect neighborhood",
    description: "Find your perfect neighborhood beyond just rent. Currently available for Columbus, Ohio.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TransitionWrapper>{children}</TransitionWrapper>
      </body>
    </html>
  );
}
