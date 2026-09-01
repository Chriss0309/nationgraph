import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { loadDossier } from "@/lib/dossier";

import "./globals.css";

const body = Geist({
  variable: "--font-sans-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const { metrics } = loadDossier();

export const metadata: Metadata = {
  title: "demograph — Know before the RFP drops",
  description:
    metrics.medianLeadDays === null
      ? "demograph traces procurement intent in public board documents before the RFP drops."
      : `demograph found a public board signal ${metrics.medianLeadDays} days before the RFP dropped.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
