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
      {/* Left Column: Wordmark Box & Subtitle */}
      <div className="min-w-0 flex flex-col md:flex-row items-start md:items-center gap-3">
        <Link 
          href="/" 
          className="wordmark inline-flex items-center gap-3 p-1.5 px-3.5 bg-[var(--panel2)] border border-[var(--soft)] hover:border-[var(--banana-lo)]/60 rounded-xl transition-all duration-200 shadow-sm group shrink-0"
        >
          <img 
            src="/logo.jpg" 
            alt="Émile Logo" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-lg border border-[var(--banana)]/40 shadow-md object-cover group-hover:scale-105 transition-transform" 
          />
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg md:text-xl tracking-tight text-[#F0F5FA] group-hover:text-[var(--banana)] transition-colors leading-none">
              Émile
            </span>
            <span className="text-[9.5px] font-mono text-[var(--faint)] tracking-wider uppercase mt-1">
              Robinhood Agent
            </span>
          </div>
        </Link>
        <div className="sub text-[var(--dim)] text-xs max-w-[54ch] leading-relaxed truncate md:whitespace-normal">
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
