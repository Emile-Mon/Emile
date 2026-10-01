import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Epoch Labs — Autonomous Robinhood Chain Token Survival Agent",
  description: "Epoch Labs observes every Robinhood Chain token that clears $10K peak market cap and estimates its probability of reaching $30K.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/epoch-logo.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" }
    ],
    shortcut: "/epoch-logo.png",
    apple: "/epoch-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
