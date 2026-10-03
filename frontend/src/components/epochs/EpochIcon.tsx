import React from 'react';
import type { EpochStatus } from './types';

// Small hourglass: empty (locked), running (active), full (complete). Shape differs per state, not just color.
const GLASS = 'M5 2 H19 C19 8 13.5 10.5 13 12 C13.5 13.5 19 16 19 22 H5 C5 16 10.5 13.5 11 12 C10.5 10.5 5 8 5 2 Z';

export const EpochIcon: React.FC<{ status: EpochStatus; className?: string }> = ({ status, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d={GLASS} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    {status === 'active' && (
      <g className="epoch-icon-run">
        <path d="M7.5 4.5 H16.5 C16 7.5 13.5 9.5 12 10.5 C10.5 9.5 8 7.5 7.5 4.5 Z" fill="currentColor" opacity="0.55" />
        <line x1="12" y1="11" x2="12" y2="18" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1.5" />
        <path d="M8.5 20.5 Q12 17 15.5 20.5 Z" fill="currentColor" />
      </g>
    )}
    {status === 'complete' && <path d="M6.5 21 C6.5 16.5 10.5 14.2 12 13.2 C13.5 14.2 17.5 16.5 17.5 21 Z" fill="currentColor" />}
  </svg>
);
