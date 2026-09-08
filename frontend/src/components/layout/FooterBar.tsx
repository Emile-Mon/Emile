'use client';

import React from 'react';

export const FooterBar: React.FC = () => {
  return (
    <div className="foot p-3 px-6 border-t border-[var(--rule)] text-[var(--faint)] text-[10.5px] flex gap-4.5 flex-wrap items-center">
      <span>Simulated data · Émile is a mascot, not a financial adviser</span>
      <span className="w text-[var(--banana-lo)]">
        Four features cannot forecast a market. This measures survival, not price.
      </span>
    </div>
  );
};
