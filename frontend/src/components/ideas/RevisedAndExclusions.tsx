'use client';

import React, { useState } from 'react';

export interface EliminatedItem {
  name: string;
  lore: string;
  led_cycle: number;
  peak_score: number;
  current_score: number;
  current_rank?: number;
}

export interface ExclusionItem {
  name: string;
  first_cycle: number;
  first_seen_at: string;
  deployed_mint: string;
  deployer: string;
  block_number: number;
  time_gap_seconds: number;
}

interface RevisedAndExclusionsProps {
  eliminatedList?: EliminatedItem[];
  exclusionsList?: ExclusionItem[];
}

export const RevisedAndExclusions: React.FC<RevisedAndExclusionsProps> = ({
  eliminatedList = [],
  exclusionsList = []
}) => {
  const [activeTab, setActiveTab] = useState<'eliminated' | 'exclusions'>('eliminated');

  const defaultEliminated: EliminatedItem[] = eliminatedList.length > 0 ? eliminatedList : [
    {
      name: 'Quiver',
      lore: 'Every arrow is a claim about the future.',
      led_cycle: 1402,
      peak_score: 0.7431,
      current_score: 0.5118
    },
    {
      name: 'Longbow Chain',
      lore: 'The bow is only as good as the draw.',
      led_cycle: 1395,
      peak_score: 0.7812,
      current_score: 0.4890
    },
    {
      name: 'Nottingham Ledger',
      lore: 'Built for the ones who check the receipts.',
      led_cycle: 1388,
      peak_score: 0.7105,
      current_score: 0.3920
    }
  ];

  const defaultExclusions: ExclusionItem[] = exclusionsList.length > 0 ? exclusionsList : [
    {
      name: 'Greenwood Protocol',
      first_cycle: 1390,
      first_seen_at: '2026-09-10T14:00:00Z',
      deployed_mint: '0x7a8b9c...2d3e4f',
      deployer: '0x3f1a2b...8e9d',
      block_number: 19482103,
      time_gap_seconds: 2535
    },
    {
      name: 'Sheriff Fund',
      first_cycle: 1345,
      first_seen_at: '2026-09-08T09:00:00Z',
      deployed_mint: '0x9f8e7d...3b2a1f',
      deployer: '0x82b4...c10f',
      block_number: 19451290,
      time_gap_seconds: 4500
    }
  ];

  return (
    <div className="panel bg-[var(--panel)] border border-[var(--rule)] rounded-lg overflow-hidden flex flex-col h-[280px]">
      <div className="phead flex justify-between items-center p-2.5 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider text-[var(--dim)] font-mono">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('eliminated')}
            className={`font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'eliminated'
                ? 'text-[var(--fg-hi)] border-b-2 border-[var(--banana)] pb-0.5'
                : 'text-[var(--dim)] hover:text-[var(--fg)]'
            }`}
          >
            REVISED OUT : LED, THEN LOST ({defaultEliminated.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exclusions')}
            className={`font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'exclusions'
                ? 'text-[var(--fg-hi)] border-b-2 border-[var(--banana)] pb-0.5'
                : 'text-[var(--dim)] hover:text-[var(--fg)]'
            }`}
          >
            THEFT RECORD ({defaultExclusions.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono scrollbar-thin">
        {activeTab === 'eliminated' ? (
          <table className="w-full border-collapse text-[0.74rem]">
            <thead>
              <tr className="border-b border-[var(--rule)] text-[0.66rem] text-[var(--dim)] font-normal uppercase tracking-wider text-left">
                <th className="p-2 px-4 font-normal">Candidate</th>
                <th className="p-2 px-4 font-normal">Led Cycle</th>
                <th className="p-2 px-4 font-normal text-right">Score (Was → Now)</th>
              </tr>
            </thead>
            <tbody>
              {defaultEliminated.map((e, idx) => (
                <tr key={`${e.name}-${idx}`} className="border-b border-[var(--rule)]/60 hover:bg-white/[0.01]">
                  <td className="p-2.5 px-4">
                    <span className="text-[var(--fg)] font-medium block">{e.name}</span>
                    <span className="text-[var(--dim)] text-[0.68rem] block mt-0.5 max-w-[48ch] truncate">
                      {e.lore}
                    </span>
                  </td>
                  <td className="p-2.5 px-4 text-[var(--dim)]">{e.led_cycle}</td>
                  <td className="p-2.5 px-4 text-right tabular-nums whitespace-nowrap">
                    <span className="text-[var(--dim)] line-through mr-1.5">{e.peak_score.toFixed(4)}</span>
                    <span className="text-[var(--stall)]">{e.current_score.toFixed(4)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-[0.74rem]">
            <thead>
              <tr className="border-b border-[var(--rule)] text-[0.66rem] text-[var(--dim)] font-normal uppercase tracking-wider text-left">
                <th className="p-2 px-4 font-normal">Stolen Candidate</th>
                <th className="p-2 px-4 font-normal">Cycle</th>
                <th className="p-2 px-4 font-normal">Deployer</th>
                <th className="p-2 px-4 font-normal text-right">Gap (Sec)</th>
              </tr>
            </thead>
            <tbody>
              {defaultExclusions.map((ex, idx) => (
                <tr key={`${ex.name}-${idx}`} className="border-b border-[var(--rule)]/60 hover:bg-white/[0.01]">
                  <td className="p-2.5 px-4">
                    <span className="text-[var(--fg-hi)] font-medium block">{ex.name}</span>
                    <span className="text-[var(--dim)] text-[0.66rem] font-mono block mt-0.5">
                      Block #{ex.block_number}
                    </span>
                  </td>
                  <td className="p-2.5 px-4 text-[var(--dim)]">{ex.first_cycle}</td>
                  <td className="p-2.5 px-4 text-[var(--banana-lo)] font-mono text-[0.68rem]">
                    {ex.deployer}
                  </td>
                  <td className="p-2.5 px-4 text-right text-[var(--stall)] font-mono tabular-nums">
                    +{ex.time_gap_seconds}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
