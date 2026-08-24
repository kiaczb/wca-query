import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "WCA Statisztika AI — kérdezz a versenyeredményekről",
    template: "%s | WCA Statisztika AI",
  },
  description:
    "Kérdezz a WCA hivatalos versenyeredményeiről magyarul, természetes nyelven. A kérdésből SQL lesz, az eredmény pedig táblázat.",
  openGraph: {
    title: "WCA Statisztika AI",
    description:
      "Kérdezz a WCA hivatalos versenyeredményeiről magyarul, természetes nyelven.",
    locale: "hu_HU",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col bg-canvas`}
      >
        <a
          href="#main"
          className="sr-only rounded-control bg-foreground px-4 py-2 text-sm font-semibold text-background focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60"
        >
          Ugrás a tartalomra
        </a>
        {children}
      </body>
    </html>
  );
}
