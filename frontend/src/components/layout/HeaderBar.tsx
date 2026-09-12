'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EMILE_CONTRACT_ADDRESS } from '@/config/constants';

interface HeaderBarProps {
  phaseText?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ phaseText = 'phase 1 · learning' }) => {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const handleCopyCA = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(EMILE_CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { name: 'Hero', href: '/' },
    { name: 'Console', href: '/console' },
    { name: 'Brain', href: '/brain' },
    { name: 'Launches', href: '/launches' },
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
            src="/logo.jpg" 
            alt="Émile Logo" 
            className="w-14 h-14 md:w-18 md:h-18 rounded-xl border border-[var(--banana)]/60 shadow-lg object-cover group-hover:scale-105 transition-transform" 
          />
          <div className="flex flex-col">
            <span className="font-serif font-bold text-2xl md:text-3xl tracking-tight text-[#F0F5FA] group-hover:text-[var(--banana)] transition-colors leading-tight">
              Émile
            </span>
            <span className="text-xs md:text-sm font-mono text-[var(--banana)]/90 tracking-widest uppercase mt-1 font-semibold">
              Robinhood Agent
            </span>
          </div>
        </Link>
        <div className="sub text-[var(--dim)] text-xs md:text-sm max-w-[50ch] leading-relaxed truncate md:whitespace-normal">
          Émile has been at this desk since day one, reading every Robinhood Chain token that clears $10K. A banana goes in the jar only when the evidence is <em className="text-[var(--banana)] not-italic font-medium">provably</em> good enough.
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
              ? 'bg-[var(--banana)]/15 text-[var(--banana)] border border-[var(--banana)] shadow-[0_0_12px_rgba(242,201,76,0.35)] font-semibold'
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

      {/* Right Column: GitHub & X Redirects & $EMILE Badge */}
      <div className="topright flex items-center justify-end gap-3 shrink-0">
        <a
          href="https://github.com/Emile-Mon/Emile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center p-2.5 rounded-lg bg-[var(--panel2)] border border-[var(--soft)] text-[var(--dim)] hover:text-[#F0F5FA] hover:border-[var(--banana)] hover:bg-white/5 transition-all duration-200 shadow-sm"
          title="Émile GitHub Repository"
        >
          <svg className="w-4 h-4 fill-current text-[var(--banana)]" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        <a
          href="https://x.com/emilelearns?s=11"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center p-2.5 rounded-lg bg-[var(--panel2)] border border-[var(--soft)] text-[var(--dim)] hover:text-[#F0F5FA] hover:border-[var(--banana)] hover:bg-white/5 transition-all duration-200 shadow-sm"
          title="Follow Émile on X (@emilelearns)"
        >
          <svg className="w-4 h-4 fill-current text-[var(--banana)]" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <div className="text-right shrink-0 min-w-[90px] hidden sm:block">
          <div className="sym text-[var(--banana)] font-serif text-base font-semibold glow-banana leading-none">$EMILE</div>
          <div className="phase text-[var(--faint)] text-[10.5px] mt-1 font-mono uppercase tracking-wider leading-none">{phaseText}</div>
        </div>
      </div>
    </header>
  );
};
