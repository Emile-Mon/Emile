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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
