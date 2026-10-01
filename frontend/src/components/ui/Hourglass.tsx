'use client';

import React, { useId } from 'react';

interface HourglassProps {
  /** Progress 0–100: how much sand has fallen into the bottom bulb. */
  pct: number;
  className?: string;
}

// Glass silhouette: top bulb y 18→110 (neck), bottom bulb y 110→202.
const GLASS_PATH =
  'M30 18 H110 C110 60 76 94 73 110 C76 126 110 160 110 202 H30 C30 160 64 126 67 110 C64 94 30 60 30 18 Z';
const TOP_Y = 20;
const NECK_Y = 110;
const BOTTOM_Y = 200;
const BULB_H = NECK_Y - TOP_Y;
const CX = 70;
const GRAINS = [0, 0.18, 0.36, 0.54, 0.72, 0.9];
const TICKS = [0, 25, 50, 75, 100];

export const Hourglass: React.FC<HourglassProps> = ({ pct, className }) => {
  const id = useId().replace(/:/g, '');
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const done = p >= 1;
  const flowing = p > 0 && !done;

  const bottomH = p * BULB_H;
  const topH = (1 - p) * BULB_H;
  const surfaceY = BOTTOM_Y - bottomH;
  // Sand piles into a mound below and sinks into a funnel above.
  const mound = Math.min(10, bottomH * 0.6);
  const funnel = Math.min(8, topH * 0.5);
  const ease = '700ms var(--ease-instrument)';

  const bottomSand = `M0 ${BOTTOM_Y + 4} V${surfaceY + mound} Q${CX} ${surfaceY - mound} 140 ${surfaceY + mound} V${BOTTOM_Y + 4} Z`;
  const topSurface = NECK_Y - topH;
  const topSand = topH <= 0.5
    ? ''
    : `M0 ${NECK_Y + 2} V${topSurface} Q${CX} ${topSurface + funnel * 2} 140 ${topSurface} V${NECK_Y + 2} Z`;

  const glow = done ? 'var(--live)' : 'var(--banana)';

  return (
    <svg viewBox="0 0 160 220" className={className} role="img" aria-label={`Hourglass ${Math.round(p * 100)}% complete`}>
      <defs>
        <clipPath id={`glass-${id}`}>
          <path d={GLASS_PATH} />
        </clipPath>
        <linearGradient id={`sand-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--banana-lo)" />
          <stop offset="70%" stopColor="var(--banana)" />
          <stop offset="100%" stopColor="var(--banana-hi)" />
        </linearGradient>
        <linearGradient id={`brass-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--surface-raised)" />
          <stop offset="50%" stopColor="var(--banana-lo)" />
          <stop offset="100%" stopColor="var(--surface-raised)" />
        </linearGradient>
        <linearGradient id={`post-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--panel2)" />
          <stop offset="50%" stopColor="var(--banana)" />
          <stop offset="100%" stopColor="var(--panel2)" />
        </linearGradient>
        <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.14" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0%" stopColor={glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Ambient halo, brightest where the sand is */}
      <ellipse cx={CX} cy={done ? 160 : 140} rx="66" ry="70" fill={`url(#halo-${id})`}>
        <animate attributeName="opacity" values="0.55;1;0.55" dur={done ? '1.6s' : '3.2s'} repeatCount="indefinite" />
      </ellipse>

      {/* Scale ticks */}
      {TICKS.map((t) => {
        const y = BOTTOM_Y - (t / 100) * BULB_H;
        const reached = p * 100 >= t;
        return (
          <g key={t}>
            <line x1="132" x2={t % 50 === 0 ? 140 : 137} y1={y} y2={y}
              stroke={reached ? 'var(--banana)' : 'var(--border-strong)'} strokeWidth="1" />
            {t % 50 === 0 && (
              <text x="143" y={y + 2.5} fontSize="7" fontFamily="var(--font-jetbrains), monospace"
                fill={reached ? 'var(--banana)' : 'var(--faint)'}>{t}</text>
            )}
          </g>
        );
      })}

      {/* Frame posts */}
      <rect x="14" y="14" width="5" height="192" rx="2.5" fill={`url(#post-${id})`} />
      <rect x="121" y="14" width="5" height="192" rx="2.5" fill={`url(#post-${id})`} />

      {/* Glass interior */}
      <path d={GLASS_PATH} fill="var(--crt)" />

      <g clipPath={`url(#glass-${id})`}>
        {/* Remaining sand in the top bulb */}
        {topSand && <path d={topSand} fill={`url(#sand-${id})`} opacity="0.75" style={{ transition: `d ${ease}` }} />}
        {/* Accumulated sand in the bottom bulb */}
        <path d={bottomSand} fill={`url(#sand-${id})`} style={{ transition: `d ${ease}` }} />

        {/* Target line: bottom bulb full = 100% */}
        <line x1="20" x2="120" y1={TOP_Y + BULB_H + 4} y2={TOP_Y + BULB_H + 4}
          stroke="var(--live)" strokeWidth="1" strokeDasharray="3 3" opacity={done ? 1 : 0.6} />

        {/* Falling stream + grains */}
        {flowing && (
          <g>
            <line x1={CX} x2={CX} y1={NECK_Y - 4} y2={surfaceY} stroke="var(--banana)" strokeWidth="1.2" opacity="0.7" />
            {GRAINS.map((delay) => (
              <circle key={delay} cx={CX} r="1.4" fill="var(--banana-hi)">
                <animate attributeName="cy" from={NECK_Y - 4} to={surfaceY} dur="1.1s" begin={`${delay}s`} repeatCount="indefinite" />
                <animate attributeName="cx" values={`${CX};${CX + (delay > 0.5 ? 1.5 : -1.5)};${CX}`} dur="1.1s" begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {/* Splash glow where grains land */}
            <ellipse cx={CX} cy={surfaceY} rx="7" ry="2.5" fill="var(--banana-hi)" filter={`url(#blur-${id})`}>
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.55s" repeatCount="indefinite" />
            </ellipse>
          </g>
        )}

        {/* Moving light sweep across the glass */}
        <rect x="-60" y="0" width="40" height="220" fill={`url(#sheen-${id})`} transform="skewX(-18)">
          <animate attributeName="x" values="-60;200;200" keyTimes="0;0.45;1" dur="5s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* Glass outline + static highlights */}
      <path d={GLASS_PATH} fill="none" stroke={done ? 'var(--live)' : 'rgb(254 250 240 / .25)'} strokeWidth="1.5"
        style={{ transition: `stroke ${ease}` }} />
      <path d="M37 26 C38 58 54 86 63 102" fill="none" stroke="rgb(254 250 240 / .18)" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 194 C38 162 54 134 63 118" fill="none" stroke="rgb(254 250 240 / .1)" strokeWidth="2" strokeLinecap="round" />

      {/* End plates */}
      {[6, 202].map((y) => (
        <g key={y}>
          <rect x="6" y={y} width="128" height="12" rx="3" fill={`url(#brass-${id})`} stroke="var(--border-strong)" />
          <line x1="12" x2="128" y1={y + 6} y2={y + 6} stroke="rgb(254 250 240 / .1)" />
        </g>
      ))}
    </svg>
  );
};
