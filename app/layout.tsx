import type { Metadata } from "next";
import "./globals.css";
import TransitionWrapper from "@/components/TransitionWrapper";
import FooterWrapper from "@/components/FooterWrapper";

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
      <body className="flex min-h-screen flex-col">
        <main className="flex-1">
          <TransitionWrapper>{children}</TransitionWrapper>
        </main>
        <FooterWrapper />
      </body>
    </html>
  );
}
