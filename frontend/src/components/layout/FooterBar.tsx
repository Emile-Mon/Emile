'use client';

import React, { useState } from 'react';
import { EPOCH_CONTRACT_ADDRESS } from '@/config/constants';

export const FooterBar: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EPOCH_CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = EPOCH_CONTRACT_ADDRESS;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="foot p-3 px-6 border-t border-[var(--rule)] text-[var(--faint)] text-[10.5px] flex gap-4.5 flex-wrap items-center justify-between">
      <div className="flex items-center gap-3.5 flex-wrap">
        <span>Live Mainnet Data · Epoch Labs is a research platform, not a financial adviser</span>
        <span className="w text-[var(--banana-lo)]">
          Four features cannot forecast a market. This measures survival, not price.
        </span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* CA in Footer */}
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--panel)] border border-[var(--rule)] hover:border-[var(--live)]/60 text-[var(--dim)] hover:text-[var(--text)] transition-all cursor-pointer font-mono select-none group/footer-ca"
          title="Click to copy CA"
        >
          <span className="text-[var(--live)] font-semibold">CA:</span>
          <span className="hidden md:inline font-mono">{EPOCH_CONTRACT_ADDRESS}</span>
          <span className="inline md:hidden font-mono">
            {EPOCH_CONTRACT_ADDRESS.slice(0, 6)}...{EPOCH_CONTRACT_ADDRESS.slice(-4)}
          </span>
          {copied ? (
            <span className="text-[var(--live)] text-[10px] font-bold flex items-center gap-1 ml-0.5">
              <svg className="w-3 h-3 text-[var(--live)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              COPIED
            </span>
          ) : (
            <svg className="w-3 h-3 opacity-60 group-hover/footer-ca:opacity-100 transition-opacity ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        <a
          href="https://x.com/EpochLabsHQ"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--banana)] transition-colors font-mono"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>@EpochLabsHQ</span>
        </a>
      </div>
    </div>
  );
};
