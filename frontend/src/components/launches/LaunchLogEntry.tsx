'use client';

import React, { useState } from 'react';
import { ContributionItem } from './PreparingLaunchCard';

export interface LaunchItemData {
  launch_id: number;
  day_index: number;
  cycle_id: number;
  run_id: number;
  candidate_id: number;
  name: string;
  symbol: string;
  lore: string;
  launch_hour: number;
  rank_in_cycle: number;
  predicted_prob: number;
  prediction_sha: string;
  prediction_at: string;
  status: string;
  mint?: string | null;
  deployed_at?: string | null;
  peak_mc?: number | null;
  holders_48h?: number | null;
  outcome?: string | null;
  contributions?: ContributionItem[];
  image_url?: string | null;
  dexscreener_url?: string | null;
  website_url?: string | null;
  twitter_url?: string | null;
}

interface LaunchLogEntryProps {
  data: LaunchItemData;
}

export const LaunchLogEntry: React.FC<LaunchLogEntryProps> = ({ data }) => {
  const [showWhy, setShowWhy] = useState(false);

  const isPassed = data.outcome === 'passed';
  const isStalled = data.outcome === 'stalled';

  const statusClass = isPassed ? 'p border-[var(--green)] text-[var(--green)]' : (isStalled ? 's border-[var(--stall)] text-[var(--stall)]' : 'w border-[var(--banana-lo)] text-[var(--banana-lo)]');
  const statusLabel = isPassed ? 'PASSED · REACHED $30K' : (isStalled ? 'STALLED · DID NOT REACH $30K' : 'PENDING 48h · TRACKING IN PROGRESS');

  const logoSrc = data.image_url || ((data.symbol === 'BANANA' || data.name.includes('BANANA')) ? '/banana-logo.jpeg' : null);

  return (
    <div className="entry border-b border-[var(--rule)] last:border-b-0 font-mono">
      <div className="etop grid grid-cols-1 lg:grid-cols-[1fr_15rem] gap-4 lg:gap-8 p-4 md:p-5">
        <div>
          <div className="day text-[0.64rem] tracking-widest text-[var(--dim)] mb-1 uppercase">
            DAY {String(data.day_index).padStart(3, '0')} : {data.deployed_at ? data.deployed_at.slice(0, 10) : ''} {String(data.launch_hour).padStart(2, '0')}:00 UTC : CYCLE {data.cycle_id} : RUN {data.run_id}
          </div>
          <div className="flex items-center gap-3">
            {logoSrc && (
              <img
                src={logoSrc}
                alt={`${data.symbol} Logo`}
                className="w-9 h-9 rounded-md object-cover border border-[var(--banana)]/50 shrink-0"
              />
            )}
            <h4 className="tname font-serif text-xl font-normal text-[var(--fg-hi)] m-0 leading-snug">
              {data.name} <span className="tick text-[var(--banana)] text-xs font-mono ml-1.5">${data.symbol || data.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase()}</span>
            </h4>
          </div>
          <p className="tlore text-[var(--dim)] text-xs mt-1.5 max-w-[50ch] leading-relaxed">
            {data.lore}
          </p>

          <div className="meta flex flex-wrap gap-4 mt-3 text-[0.68rem] text-[var(--dim)]">
            <span>rank <b className="text-[var(--fg)] font-normal">{data.rank_in_cycle} of 100</b></span>
            <span>launch hour <b className="text-[var(--fg)] font-normal">{String(data.launch_hour).padStart(2, '0')}:00 UTC</b></span>
            {data.peak_mc !== null && data.peak_mc !== undefined && (
              <span>peak MC <b className="text-[var(--fg)] font-normal">${data.peak_mc.toLocaleString('en-US')}</b></span>
            )}
            {data.holders_48h && (
              <span>holders at 48h <b className="text-[var(--fg)] font-normal">{data.holders_48h}</b></span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className={`status ${statusClass} inline-block text-[0.64rem] tracking-wider p-1 px-2.5 border rounded uppercase font-semibold`}>
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={() => setShowWhy(!showWhy)}
              className="text-[0.68rem] text-[var(--banana)] hover:underline font-mono"
            >
              {showWhy ? 'Hide feature contributions ↑' : 'Why this one (SHAP) ↓'}
            </button>
          </div>
        </div>

        {/* Prediction Box */}
        <div className="pred border-l border-[var(--rule)] pl-4 font-mono flex flex-col justify-center">
          <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] uppercase mb-1">
            PREDICTED SURVIVAL
          </div>
          <div className="big font-serif text-2xl font-semibold text-[var(--banana)] leading-none tabular-nums">
            {data.predicted_prob.toFixed(4)}
          </div>
          <p className="note text-[0.64rem] text-[var(--dim)] mt-2 leading-relaxed">
            Committed at {data.prediction_at.slice(11, 19)} UTC.
            <br />
            Commitment {data.prediction_sha.slice(0, 10)}…
          </p>
        </div>
      </div>

      {/* Feature Contributions Dropdown */}
      {showWhy && (
        <div className="why bg-[var(--panel2)] border-t border-[var(--rule)] p-4 px-5 font-mono">
          <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] uppercase mb-2">
            WHY THIS ONE : FEATURE CONTRIBUTIONS
          </div>
          <div className="bars grid gap-2 max-w-[44rem]">
            {(() => {
              const maxAbs = Math.max(0.001, ...(data.contributions || []).map(c => Math.abs(c.value)));
              return (data.contributions || []).map((c, idx) => {
                const isPos = c.value >= 0;
                const absVal = Math.abs(c.value);
                const widthPct = (absVal / maxAbs) * 100;
                const isZero = c.value === 0;

                return (
                  <div key={idx} className="bar grid grid-cols-[1fr_auto] gap-3 items-center text-[0.7rem]">
                    <span className="t text-[var(--fg)]">{c.label}</span>
                    <span className="v text-[var(--dim)] tabular-nums">{isPos ? `+${c.value.toFixed(3)}` : c.value.toFixed(3)}</span>
                    <div className="track col-span-2 h-[3px] bg-[var(--rule)]">
                      <div
                        className={`h-full ${isPos ? 'bg-[var(--banana-lo)]' : 'bg-[var(--stall)]'}`}
                        style={{ width: isZero ? '1px' : `${widthPct.toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="links flex flex-wrap gap-4 mt-3 text-[0.68rem]">
            {data.dexscreener_url ? (
              <a
                href={data.dexscreener_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--banana)] hover:underline flex items-center gap-1 font-semibold"
              >
                DexScreener Live Pair ↗
              </a>
            ) : (
              data.mint && (
                <a
                  href={`https://dexscreener.com/robinhood/${data.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--cyan)] hover:underline"
                >
                  DexScreener Pair ({data.mint.slice(0, 8)}…)
                </a>
              )
            )}
            {data.mint && (
              <a
                href={`https://robinhood.dune.com/token/${data.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cyan)] hover:underline"
              >
                Contract Explorer ({data.mint.slice(0, 8)}…)
              </a>
            )}
            {data.website_url && (
              <a href={data.website_url} target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">
                Website ↗
              </a>
            )}
            {data.twitter_url && (
              <a href={data.twitter_url} target="_blank" rel="noopener noreferrer" className="text-[var(--cyan)] hover:underline">
                Twitter/X ↗
              </a>
            )}
            <a href="/brain" className="text-[var(--cyan)] hover:underline">
              View Candidate Cycle #{data.cycle_id}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
