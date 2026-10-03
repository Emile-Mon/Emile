import React from 'react';

interface Props {
  floor: number;      // proven floor of the latest model run
  start: number;      // floor_auc: sand starts falling above this (chance level)
  full: number;       // target_auc: hourglass is full here
}

// Visible range of the scale: a margin either side of [start, full], widened to keep the live floor on it.
const range = (floor: number, start: number, full: number) => {
  const pad = (full - start) * 1.5;
  return [Math.min(start - pad, floor - 0.02), Math.max(full + pad * 0.6, floor + 0.02)];
};

/** Explains why the hourglass is (not yet) filling: where the proven floor sits against 0.50 and 0.60. */
export const FloorGauge: React.FC<Props> = ({ floor, start, full }) => {
  const [lo, hi] = range(floor, start, full);
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const below = floor < start;
  const filled = floor >= full;

  return (
    <div className="w-full max-w-[420px] mt-5">
      <div className="relative h-2.5 rounded-full bg-[var(--panel2)] border border-[var(--soft)]" role="img"
        aria-label={`Proven floor ${floor.toFixed(3)}. Sand starts above ${start.toFixed(2)}, full at ${full.toFixed(2)}.`}>
        {/* Fill zone: start -> full */}
        <div className="absolute inset-y-0 rounded-full bg-[var(--banana)]/25 border-x border-[var(--banana)]/60"
          style={{ left: pos(start), width: `calc(${pos(full)} - ${pos(start)})` }} />
        {/* Live floor marker */}
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[var(--ink)] bg-[var(--banana)] shadow-[0_0_10px_var(--banana-glow)] transition-[left] duration-700"
          style={{ left: pos(floor) }} />
      </div>
      <div className="relative h-5 mt-1 font-mono text-[10px] text-[var(--faint)]">
        <span className="absolute -translate-x-1/2" style={{ left: pos(start) }}>{start.toFixed(2)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(full) }}>{full.toFixed(2)}</span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--dim)] text-center">
        {filled
          ? `The proven floor has cleared ${full.toFixed(2)}: the hourglass is full.`
          : below
            ? `Sand starts falling once the proven floor clears ${start.toFixed(2)} (better than chance) and the hourglass is full at ${full.toFixed(2)}. The floor rises as more labeled tokens shrink the uncertainty penalty.`
            : `The proven floor is above ${start.toFixed(2)}: sand is falling. The hourglass is full at ${full.toFixed(2)}.`}
      </p>
    </div>
  );
};
