'use client';

import React from 'react';
import { CandidateItem } from './CandidatesList';

interface ScoreHistogramProps {
  candidates?: CandidateItem[];
}

export const ScoreHistogram: React.FC<ScoreHistogramProps> = ({ candidates = [] }) => {
  const binCount = 28;
  const bins = new Array(binCount).fill(0);

  if (candidates.length > 0) {
    candidates.forEach(c => {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor(c.score * binCount)));
      bins[index]++;
    });
  } else {
    // Demo bell curve if no candidates passed yet
    const demoValues = [1, 2, 3, 5, 8, 12, 18, 24, 30, 26, 20, 14, 9, 6, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    demoValues.forEach((val, idx) => { bins[idx] = val; });
  }

  const maxVal = Math.max(1, ...bins);

  return (
    <div className="panel bg-[var(--panel)] border border-[var(--rule)] rounded-lg overflow-hidden flex flex-col h-[280px]">
      <div className="phead flex justify-between items-baseline p-2.5 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider text-[var(--dim)] font-mono uppercase">
        <span>SCORE DISTRIBUTION, THIS CYCLE</span>
        <span className="text-[var(--banana-lo)] font-mono">n = {candidates.length || 100}</span>
      </div>

      <div className="flex-1 flex flex-col justify-end p-4 pb-0">
        <div className="hist flex items-end gap-[2px] h-[110px] px-1">
          {bins.map((val, i) => {
            const heightPercent = (val / maxVal) * 100;
            const isHot = i > 20;

            return (
              <div
                key={`bin-${i}`}
                title={`Bin ${(i / binCount).toFixed(2)} - ${((i + 1) / binCount).toFixed(2)}: ${val} candidates`}
                className={`flex-1 transition-all duration-300 min-h-[2px] rounded-t-sm ${
                  isHot ? 'bg-[var(--banana-lo)]' : 'bg-[var(--rule)] hover:bg-[var(--fg-hi)]'
                }`}
                style={{ height: `${Math.max(2, heightPercent).toFixed(1)}%` }}
              />
            );
          })}
        </div>
        
        <div className="haxis flex justify-between pt-2 px-1 text-[0.64rem] text-[var(--dim)] font-mono border-t border-[var(--rule)] mt-2">
          <span>0.00</span>
          <span>0.50</span>
          <span>1.00</span>
        </div>
      </div>

      <p className="note text-[0.7rem] text-[var(--dim)] p-3 px-4 m-0 border-t border-[var(--rule)] font-mono leading-relaxed truncate">
        The distribution matters more than the leader. A model with nothing to say produces a narrow bell around the base rate. As it learns, the tail stretches right.
      </p>
    </div>
  );
};
