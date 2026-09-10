'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderBarProps {
  phaseText?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ phaseText = 'phase 1 · learning' }) => {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Hero', href: '/' },
    { name: 'Console', href: '/console' },
    { name: 'About', href: '/about' },
  ];

  return (
    <header className="top glass-panel grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center p-4 px-5 md:px-7 border-b border-[var(--rule)] gap-4 relative z-20">
      {/* Left Column: Wordmark & Subtitle */}
      <div className="min-w-0">
        <Link href="/" className="wordmark inline-block hover:opacity-90 transition-opacity">
          Émile
        </Link>
        <div className="sub text-[var(--dim)] text-xs mt-1 max-w-[60ch] leading-relaxed truncate md:whitespace-normal">
          Émile has been at this desk since day one, reading every Robinhood Chain token that clears $10K. A banana goes in the jar only when the evidence is <em className="text-[var(--banana)] not-italic font-medium">provably</em> good enough.
        </div>
      </div>

      {/* Center Navigation Tabs - Fixed Width Buttons (No Shift/Jumping) */}
      <nav className="flex items-center gap-1 p-1 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg text-xs font-mono shrink-0 justify-center">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`w-20 text-center py-1.5 rounded-md font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[var(--rule)] text-[var(--banana)] border border-[var(--banana-lo)]/40 shadow-sm'
                  : 'text-[var(--dim)] hover:text-[var(--fg)] hover:bg-white/5 border border-transparent'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Right Column: $EMILE Badge & Phase */}
      <div className="topright text-right shrink-0 min-w-[110px] hidden sm:block">
        <div className="sym text-[var(--banana)] font-serif text-base font-semibold glow-banana leading-none">$EMILE</div>
        <div className="phase text-[var(--faint)] text-[10.5px] mt-1 font-mono uppercase tracking-wider leading-none">{phaseText}</div>
      </div>
    </header>
  );
};
