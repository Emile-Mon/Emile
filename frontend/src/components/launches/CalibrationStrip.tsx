'use client';

import React from 'react';

export interface CalibrationData {
  launches_total?: number;
  resolved_count?: number;
  open_count?: number;
  predicted_survivors?: number;
  actual_survivors?: number;
  brier_score?: number;
  calibration_direction?: string;
}

interface CalibrationStripProps {
  data?: CalibrationData;
}

export const CalibrationStrip: React.FC<CalibrationStripProps> = ({ data }) => {
  const resolved = data?.resolved_count ?? 0;
  
  // Section 5: Calibration strip and Brier score require 5 or more resolved launches.
  // Below threshold the element is ABSENT.
  if (resolved < 5) {
    return null;
  }

  const total = data?.launches_total || resolved;
  const openCount = data?.open_count || 0;
  const predictedSurvivors = data?.predicted_survivors || 0;
  const actualSurvivors = data?.actual_survivors || 0;
  const brierScore = data?.brier_score || 0;
  const minResolved = 20;

  const hasEnoughResolved = resolved >= minResolved;
  const calibDirection = hasEnoughResolved ? (data?.calibration_direction || 'overconfident') : 'insufficient data';

  return (
    <div className="calib grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-[var(--rule)] border border-[var(--rule)] mb-6 rounded-lg overflow-hidden font-mono">
      <div className="cell bg-[var(--panel2)] p-3 px-4">
        <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] mb-1 uppercase">LAUNCHES</div>
        <div className="val font-serif text-2xl font-semibold text-[var(--fg-hi)] leading-none tabular-nums">
          {total}
        </div>
        <div className="sub text-[0.62rem] text-[var(--dim)] mt-1.5">{resolved} resolved, {openCount} open</div>
      </div>

      <div className="cell bg-[var(--panel2)] p-3 px-4">
        <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] mb-1 uppercase">PREDICTED SURVIVORS</div>
        <div className="val font-serif text-2xl font-semibold text-[var(--fg-hi)] leading-none tabular-nums">
          {predictedSurvivors.toFixed(1)}
        </div>
        <div className="sub text-[0.62rem] text-[var(--dim)] mt-1.5">sum of probabilities</div>
      </div>

      <div className="cell bg-[var(--panel2)] p-3 px-4">
        <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] mb-1 uppercase">ACTUAL SURVIVORS</div>
        <div className="val font-serif text-2xl font-semibold text-[var(--fg-hi)] leading-none tabular-nums">
          {actualSurvivors}
        </div>
        <div className="sub text-[0.62rem] text-[var(--dim)] mt-1.5">of {resolved} resolved</div>
      </div>

      <div className="cell bg-[var(--panel2)] p-3 px-4">
        <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] mb-1 uppercase">BRIER SCORE</div>
        <div className={`val font-serif text-2xl font-semibold leading-none tabular-nums ${hasEnoughResolved ? (brierScore > 0.25 ? 'text-[var(--stall)]' : 'text-[var(--green)]') : 'text-[var(--dim)]'}`}>
          {brierScore.toFixed(4)}
        </div>
        <div className="sub text-[0.62rem] text-[var(--dim)] mt-1.5">lower is better (0.25 = random)</div>
      </div>

      <div className="cell bg-[var(--panel2)] p-3 px-4 col-span-2 md:col-span-1">
        <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] mb-1 uppercase">CALIBRATION</div>
        <div className={`val font-serif text-xl font-semibold leading-none capitalize ${hasEnoughResolved ? 'text-[var(--stall)]' : 'text-[var(--dim)]'}`}>
          {calibDirection}
        </div>
        <div className="sub text-[0.62rem] text-[var(--dim)] mt-1.5">
          {hasEnoughResolved ? 'predicting more survivors than occur' : `${resolved} of ${minResolved} resolved required`}
        </div>
      </div>
    </div>
  );
};
