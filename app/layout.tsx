import type { Metadata } from "next";
import "./globals.css";
import "./track-map.css";

export const metadata: Metadata = {
  title: "H2H APEX Telemetry v2.0 | F1 Driver Comparison",
  description: "Explore 2026 Formula 1 driver telemetry, lap timing, sectors and data-led analysis across competitive sessions.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

