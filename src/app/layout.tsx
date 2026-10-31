import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, JetBrains_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const monoData = JetBrains_Mono({
  variable: "--font-mono-data",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kabristan — every dependency laid to rest",
  description:
    "Turn a package.json into a haunted Kabristan. Every dependency gets a tombstone, a status, and an epitaph written by Gemma through Ollama.",
  openGraph: {
    title: "Kabristan — every dependency laid to rest",
    description:
      "Paste a package.json, raise the dead, and read the epitaphs of your dependencies.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (and some browsers) inject attributes onto <html>
    // before hydration. suppressHydrationWarning tolerates attribute
    // differences only; mismatched markup still reports.
    <html
      lang="en"
      className={`dark ${display.variable} ${monoData.variable} ${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <div className="fog" aria-hidden="true">
          <span className="fog__wisp fog__wisp--violet" />
          <span className="fog__wisp fog__wisp--green" />
          <span className="fog__wisp fog__wisp--ash" />
        </div>
        <SiteHeader />
        <main className="relative z-10 flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
