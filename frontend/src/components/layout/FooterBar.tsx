'use client';

import React from 'react';

export const FooterBar: React.FC = () => {
  return (
    <div className="foot p-3 px-6 border-t border-[var(--rule)] text-[var(--faint)] text-[10.5px] flex gap-4.5 flex-wrap items-center justify-between">
      <div className="flex items-center gap-3.5 flex-wrap">
        <span>Simulated data · Émile is a mascot, not a financial adviser</span>
        <span className="w text-[var(--banana-lo)]">
          Four features cannot forecast a market. This measures survival, not price.
        </span>
      </div>
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
  );
};
