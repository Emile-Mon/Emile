'use client';

import React, { useState } from 'react';

export interface CandidateItem {
  rank: number;
  name: string;
  lore: string;
  hour: number;
  score: number;
  commitment: string;
  committed_at?: string;
}

interface CandidatesListProps {
  candidates: CandidateItem[];
  cycleId?: number;
}

export const CandidatesList: React.FC<CandidatesListProps> = ({
  candidates,
  cycleId = 1418
}) => {
  const [expandedCommitment, setExpandedCommitment] = useState<string | null>(null);

  const toggleCommitment = (commit: string) => {
    setExpandedCommitment(prev => (prev === commit ? null : commit));
  };

  return (
    <div className="panel bg-[var(--panel)] border border-[var(--rule)] rounded-lg overflow-hidden flex flex-col h-[480px]">
      <div className="phead flex justify-between items-baseline gap-4 p-3 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider text-[var(--dim)] font-mono uppercase">
        <span>ALL 100 CANDIDATES, RANKED BY MODEL SCORE</span>
        <span className="text-[var(--banana-lo)] font-mono">cycle {cycleId}</span>
      </div>
      
      <div className="cands flex-1 overflow-y-auto font-mono scrollbar-thin">
        {candidates.map((c, i) => {
          const isLead = i === 0;
          const isExpanded = expandedCommitment === c.commitment;

          return (
            <div
              key={`${c.name}-${i}`}
              className={`row grid grid-cols-[2.4rem_1fr_auto] gap-3 p-3 px-4 border-b border-[var(--rule)] items-start transition-colors duration-150 ${
                isLead
                  ? 'bg-[#E9C24B]/5 border-l-2 border-l-[var(--banana)]'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Rank column */}
              <div className="rank text-[var(--dim)] text-[0.7rem] pt-0.5">
                #{String(c.rank || i + 1).padStart(3, '0')}
              </div>

              {/* Name & Lore column */}
              <div className="min-w-0">
                <div className="nm text-[var(--fg-hi)] text-[0.8rem] font-medium leading-snug truncate">
                  {c.name}
                </div>
                <div className="lore text-[var(--dim)] text-[0.7rem] leading-normal mt-0.5">
                  {c.lore}
                </div>
                <button
                  type="button"
                  onClick={() => toggleCommitment(c.commitment)}
                  className="cm text-[0.6rem] text-[#3E4C5A] hover:text-[var(--banana-lo)] transition-colors mt-1 block font-mono text-left"
                  title="Click to view full sha256 commitment hash"
                >
                  commit {isExpanded ? c.commitment : `${c.commitment.slice(0, 16)}…`}
                </button>
              </div>

              {/* Score & Hour column */}
              <div className="text-right shrink-0">
                <div className="sc text-[var(--banana)] text-[0.78rem] font-mono tabular-nums font-semibold">
                  {c.score.toFixed(4)}
                </div>
                <div className="hr text-[var(--dim)] text-[0.66rem] text-right mt-0.5 font-mono">
                  {String(c.hour).padStart(2, '0')}:00 UTC
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
