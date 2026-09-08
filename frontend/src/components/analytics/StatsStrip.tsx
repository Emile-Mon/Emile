'use client';

import React from 'react';
import { useEmileStore } from '@/store/useEmileStore';

export const StatsStrip: React.FC = () => {
  const tally = useEmileStore((state) => state.tally);
  const holdersList = useEmileStore((state) => state.holdersList);

  const sortedHolders = [...holdersList].sort((a, b) => a - b);
  const medianHolders = sortedHolders.length ? sortedHolders[sortedHolders.length >> 1] : 288;

  return (
    <div className="stats stats-grid grid grid-cols-4 border-t border-[var(--rule)] bg-[var(--panel2)]">
      <div className="st p-3.5 px-5 border-r border-[var(--soft)]">
        <div className="st-k text-[var(--dim)] text-[10.5px] font-mono uppercase tracking-wider">above $10K</div>
        <div className="st-v font-serif text-2xl font-bold text-[#F1F6FA] mt-0.5 tracking-tight">
          {tally.all.toLocaleString()}
        </div>
      </div>

      <div className="st p-3.5 px-5 border-r border-[var(--soft)]">
        <div className="st-k text-[var(--dim)] text-[10.5px] font-mono uppercase tracking-wider">reached $30K</div>
        <div className="st-v font-serif text-2xl font-bold text-[var(--live)] mt-0.5 tracking-tight glow-live">
          {tally.pass.toLocaleString()}
        </div>
      </div>

      <div className="st p-3.5 px-5 border-r border-[var(--soft)]">
        <div className="st-k text-[var(--dim)] text-[10.5px] font-mono uppercase tracking-wider">stalled</div>
        <div className="st-v font-serif text-2xl font-bold text-[var(--stall)] mt-0.5 tracking-tight glow-stall">
          {tally.stall.toLocaleString()}
        </div>
      </div>

      <div className="st p-3.5 px-5">
        <div className="st-k text-[var(--dim)] text-[10.5px] font-mono uppercase tracking-wider">median holders</div>
        <div className="st-v font-serif text-2xl font-bold text-[var(--cyan)] mt-0.5 tracking-tight glow-cyan">
          {medianHolders.toLocaleString()}
        </div>
      </div>
    </div>
  );
};
