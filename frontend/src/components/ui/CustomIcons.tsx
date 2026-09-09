import React from 'react';

export const IconWarning: React.FC<{ className?: string }> = ({ className = "w-5 h-5 text-[var(--banana)]" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconDownload: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconFileCode: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="10 13 8 15 10 17" />
    <polyline points="14 13 16 15 14 17" />
  </svg>
);

export const IconBanana: React.FC<{ className?: string }> = ({ className = "w-5 h-5 text-[var(--banana)]" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.8 3.2c-1.5.5-3.8 2.1-5.5 4.1-2.2 2.6-3.7 5.7-4.5 8.9-.4 1.6-.6 3.4-.6 5.1 0 .6.4 1 1 1h.4c.5 0 .9-.4.9-.9.1-1.4.3-2.9.7-4.2.8-2.8 2.1-5.4 4.1-7.7 1.4-1.6 3.3-3 4.5-3.5.5-.2.7-.8.5-1.3-.2-.5-.8-.7-1.3-.5z" />
  </svg>
);

export const IconPlay: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const IconPause: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

export const IconFastForward: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="13 19 22 12 13 5 13 19" />
    <polygon points="2 19 11 12 2 5 2 19" />
  </svg>
);

export const IconReset: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5 text-current" }) => (
  <svg className={`inline-block align-middle shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);

export const IconPulseDot: React.FC<{ className?: string; color?: string }> = ({ className = "w-2.5 h-2.5", color = "var(--live)" }) => (
  <span className={`relative inline-flex items-center justify-center ${className}`}>
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
  </span>
);
