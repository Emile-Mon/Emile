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
    { name: 'Brain', href: '/brain' },
    { name: 'The Math', href: '/math' },
    // Launches is hidden from the nav for now; the /launches route still works.
    { name: 'About', href: '/about' },
  ];

  return (
    <header className="top glass-panel grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] items-center p-4 px-5 md:px-7 border-b border-[var(--rule)] gap-4 relative z-20">
      {/* Left Column: Wordmark Box & Subtitle */}
      <div className="min-w-0 flex flex-col md:flex-row items-start md:items-center gap-4">
        <Link 
          href="/" 
          className="wordmark inline-flex items-center gap-3.5 p-2 px-3.5 md:p-2.5 md:px-4 bg-[var(--panel2)] rounded-2xl transition-all duration-200 group shrink-0"
        >
          <img 
            src="/epoch-logo.png" 
            alt="Epoch Labs Logo" 
            className="w-14 h-14 md:w-18 md:h-18 rounded-xl border border-[var(--banana)]/60 shadow-lg object-contain bg-black/40 group-hover:scale-105 transition-transform p-1" 
          />
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-2xl md:text-3xl tracking-tight text-[var(--fg-hi)] group-hover:text-[var(--banana)] transition-colors leading-tight">
              Epoch Labs
            </span>
            <span className="text-xs md:text-sm font-mono text-[var(--banana)]/90 tracking-widest uppercase mt-1 font-semibold">
              Robinhood Mainnet
            </span>
          </div>
        </Link>
        <div className="sub text-[var(--dim)] text-xs md:text-sm max-w-[50ch] leading-relaxed truncate md:whitespace-normal">
          Epoch Labs has been at this desk since day one, reading every Robinhood Chain token that clears $10K. The hourglass only turns when the evidence is <em className="text-[var(--banana)] not-italic font-medium">provably</em> good enough.
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="flex items-center gap-1 p-1 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg text-xs font-mono shrink-0 justify-center">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const isLaunches = link.name === 'Launches';

          let tabStyle = 'text-[var(--dim)] hover:text-[var(--fg)] hover:bg-white/5 border border-transparent';
          if (isActive) {
            tabStyle = isLaunches
              ? 'bg-[var(--banana)]/15 text-[var(--banana)] border border-[var(--banana)] font-semibold'
              : 'bg-[var(--rule)] text-[var(--banana)] border border-[var(--banana-lo)]/40 shadow-sm';
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`relative px-3.5 py-1.5 text-center rounded-md font-medium min-w-[4.5rem] transition-all duration-200 flex items-center justify-center gap-1.5 ${tabStyle}`}
            >
              <span>{link.name}</span>
              {isLaunches && (
                <span className={`px-1.5 py-0.2 text-[0.58rem] font-black tracking-widest uppercase rounded font-mono shadow-md ${
                  isActive 
                    ? 'bg-[var(--banana)] text-[var(--panel)] animate-pulse'
                    : 'bg-[var(--banana)]/80 text-[var(--panel)] opacity-90'
                }`}>
                  NEW
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Column: X Link & $EPC Badge */}
      <div className="topright flex items-center justify-end gap-3 shrink-0">
        <a
          href="https://x.com/EpochLabsHQ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center p-2.5 rounded-lg bg-[var(--panel2)] border border-[var(--soft)] text-[var(--dim)] hover:text-[var(--fg-hi)] hover:border-[var(--banana)] hover:bg-white/5 transition-all duration-200 shadow-sm"
          title="Follow Epoch Labs on X (@EpochLabsHQ)"
        >
          <svg className="w-4 h-4 fill-current text-[var(--banana)]" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <div className="text-right shrink-0 min-w-[90px] hidden sm:block">
          <div className="sym text-[var(--banana)] font-sans font-semibold text-base leading-none">$EPC</div>
          <div className="phase text-[var(--faint)] text-[10.5px] mt-1 font-mono uppercase tracking-wider leading-none">{phaseText}</div>
        </div>
      </div>
    </header>
  );
};
