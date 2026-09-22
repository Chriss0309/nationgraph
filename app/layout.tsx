import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Chris Ooi · Predicting what school districts buy",
  description:
    "I built software to spot school district tech purchases before they go public, then tested it on 17 it had never seen. It caught 0 — and the reason is a federal rule, not a bug.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${mono.variable} h-full antialiased`}
      // Browser extensions write style and data-* onto <html> before React
      // hydrates. This suppresses that one element only, never its children.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
