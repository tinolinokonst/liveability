import type { Metadata } from "next";
import "./globals.css";
import TransitionWrapper from "@/components/TransitionWrapper";

export const metadata: Metadata = {
  title: "Liveability — Find your perfect Columbus neighborhood",
  description:
    "Search any Columbus, OH address or browse neighborhood rankings by air quality, walkability, green space, grocery access, and transit.",
  openGraph: {
    title: "Liveability — Columbus, Ohio",
    description: "Find your perfect Columbus neighborhood beyond just rent.",
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
