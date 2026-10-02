import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    process.env.NEXT_PUBLIC_API_BASE_URL || 
    'https://epochlabs-production.up.railway.app'
  ),
  title: "Epoch Labs - Autonomous Robinhood Chain Token Survival Agent",
  description: "Epoch Labs observes every Robinhood Chain token that clears $10K peak market cap and estimates its probability of reaching $30K.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Epoch Labs - Autonomous Robinhood Chain Token Survival Agent",
    description: "Epoch Labs observes every Robinhood Chain token that clears $10K peak market cap and estimates its probability of reaching $30K.",
    url: "/",
    siteName: "Epoch Labs",
    images: [
      {
        url: "/epoch-logo.png",
        width: 512,
        height: 512,
        alt: "Epoch Labs Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Epoch Labs - Autonomous Robinhood Chain Token Survival Agent",
    description: "Epoch Labs observes every Robinhood Chain token that clears $10K peak market cap and estimates its probability of reaching $30K.",
    images: ["/epoch-logo.png"],
    creator: "@EpochLabsHQ",
  },
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
