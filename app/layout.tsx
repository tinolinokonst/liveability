import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liveability NYC — Real cost of living, not just rent",
  description:
    "Compare any two NYC addresses across air quality, noise, sunlight, transit, green space, and more. Find where you can actually live well.",
  openGraph: {
    title: "Liveability NYC",
    description: "Real cost of living — not just rent.",
    url: "https://liveability.nyc",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}