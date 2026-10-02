import React from 'react';
import Link from 'next/link';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';

export default function NotFound() {
  return (
    <div className="wrap min-h-screen flex flex-col justify-between">
      <HeaderBar phaseText="error 404 - state not found" />

      <main className="w-full max-w-4xl mx-auto p-6 md:p-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* CRT Screen Style Container */}
        <div className="w-full bg-[var(--panel2)] border border-[var(--rule)] rounded-2xl p-8 md:p-14 shadow-2xl relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className="flex items-center justify-between border-b border-[var(--rule)] pb-4 mb-8 text-xs font-mono text-[var(--dim)]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--stall)] animate-ping" />
              <span>STATUS: 404 NOT_FOUND</span>
            </span>
            <span>OBSERVATION PIPELINE</span>
          </div>

          {/* Glitch / Big Numeric Display */}
          <div className="space-y-4">
            <div className="font-mono text-7xl md:text-9xl font-bold tracking-tight text-[var(--banana)] drop-shadow-sm">
              404
            </div>
            <h1 className="font-sans text-2xl md:text-3xl font-semibold text-[var(--fg-hi)] tracking-tight">
              State Not Observed in This Epoch
            </h1>
            <p className="text-[var(--dim)] text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              The requested address or data trajectory does not exist in our study population. The chain continues to move forward.
            </p>
          </div>

          {/* Action Button */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--banana)] text-[var(--ink)] font-sans font-semibold text-sm hover:bg-[var(--banana-hi)] transition-all duration-200 shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              Return to Live Feed
            </Link>
            <Link
              href="/console"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--panel)] border border-[var(--rule)] text-[var(--fg)] font-mono text-xs hover:border-[var(--banana)] transition-colors w-full sm:w-auto"
            >
              Open Research Console
            </Link>
          </div>
        </div>
      </main>

      <FooterBar />
    </div>
  );
}
