import React, { useState } from 'react';
import { EMILE_CONTRACT_ADDRESS } from '@/config/constants';

export const FooterBar: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyCA = () => {
    navigator.clipboard.writeText(EMILE_CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="foot p-3 px-6 border-t border-[var(--rule)] text-[var(--faint)] text-[10.5px] flex gap-4.5 flex-wrap items-center justify-between">
      <div className="flex items-center gap-3.5 flex-wrap">
        <span>Simulated data · Émile is a mascot, not a financial adviser</span>
        <span className="w text-[var(--banana-lo)]">
          Four features cannot forecast a market. This measures survival, not price.
        </span>
        <button
          onClick={handleCopyCA}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--panel2)] border border-[var(--rule)] text-[var(--dim)] hover:text-[var(--banana)] hover:border-[var(--banana)]/40 transition-colors font-mono cursor-pointer group"
          title="Click to copy full $EMILE Contract Address"
        >
          <span className="text-[var(--banana)] font-semibold">CA:</span>
          <span className="text-[11px] font-mono text-[var(--fg)]">{EMILE_CONTRACT_ADDRESS}</span>
          <span className={`p-1 rounded transition-colors flex items-center justify-center ${copied ? 'bg-[var(--live)] text-[var(--ink)]' : 'bg-[var(--banana)] text-[var(--ink)] group-hover:bg-[#FFE885]'}`}>
            {copied ? (
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            )}
          </span>
        </button>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/Emile-Mon/Emile"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--banana)] transition-colors font-mono"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>
        <a
          href="https://x.com/emilelearns?s=11"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--dim)] hover:text-[var(--banana)] transition-colors font-mono"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>@emilelearns</span>
        </a>
      </div>
    </div>
  );
};
