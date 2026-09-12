'use client';

import React, { useState } from 'react';

export interface ContributionItem {
  feature: string;
  label: string;
  value: number;
}

export interface AuthorshipInfo {
  name: 'human' | 'model' | string;
  lore: 'human' | 'model' | string;
  hour: 'human' | 'model' | string;
  holders: 'market' | string;
}

export interface PreparingLaunchData {
  launch_id: number;
  day_index: number;
  cycle_id: number;
  run_id: number;
  candidate_id: number;
  name: string;
  symbol: string;
  lore: string;
  launch_hour: number;
  rank_in_cycle?: number;
  predicted_prob: number;
  prediction_sha: string;
  prediction_at: string;
  status: string;
  mint?: string | null;
  liquidity_display?: string;
  authorship?: AuthorshipInfo;
  contributions?: ContributionItem[];
  why_text?: string;
}

interface PreparingLaunchCardProps {
  data?: PreparingLaunchData;
}

export const PreparingLaunchCard: React.FC<PreparingLaunchCardProps> = ({ data }) => {
  const dayIndex = data?.day_index || 7;
  const cycleId = data?.cycle_id || 1418;
  const runId = data?.run_id || 444;
  const name = data?.name || 'Fletcher';
  const rawSymbol = data?.symbol;
  const symbol = (!rawSymbol || rawSymbol === 'SHRWD' || name === 'Fletcher') ? 'FLTCHR' : rawSymbol;
  const lore = data?.lore || 'Built for the ones who check the receipts.';
  const launchHour = data?.launch_hour || 14;
  const rankInCycle = data?.rank_in_cycle || 1;
  const predictedProb = data?.predicted_prob !== undefined ? data.predicted_prob : 0.8117;
  const predictionSha = data?.prediction_sha || 'a91f7c2e8b1034fe9823c45d67e890ab12345678';
  const predictionAt = data?.prediction_at || new Date().toISOString();
  const currentStatus = data?.status || 'PREPARING — AWAITING DEPLOYMENT';
  const liquidity = data?.liquidity_display || '0.05 ETH';

  const [expandedHash, setExpandedHash] = useState<boolean>(false);

  const authorship: AuthorshipInfo = data?.authorship || {
    name: 'human',
    lore: 'model',
    hour: 'model',
    holders: 'market'
  };

  const getAuthorshipText = (auth: AuthorshipInfo): string => {
    const parts: string[] = [];
    parts.push(auth.name === 'human' ? 'Name chosen by us.' : 'Name chosen by the model.');
    parts.push(auth.lore === 'model' && auth.hour === 'model' ? 'Lore and launch hour chosen by the model.' : 'Lore and launch hour chosen by human.');
    parts.push(auth.holders === 'market' ? 'Holder count belongs to the market.' : '');
    return parts.filter(Boolean).join(' ');
  };

  const formatTimestampToSecond = (rawIsoStr: string): string => {
    try {
      const date = new Date(rawIsoStr);
      if (isNaN(date.getTime())) return rawIsoStr;
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      const hh = String(date.getUTCHours()).padStart(2, '0');
      const min = String(date.getUTCMinutes()).padStart(2, '0');
      const ss = String(date.getUTCSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
    } catch {
      return rawIsoStr;
    }
  };

  const contributions: ContributionItem[] = data?.contributions || [
    { feature: 'launch_hour_cos', label: 'Launch hour 14:00 UTC', value: 0.211 },
    { feature: 'lore_length', label: 'Lore length 71 characters', value: 0.094 },
    { feature: 'name_tokens', label: 'Name token count 2', value: 0.038 },
    { feature: 'holders', label: 'Holder count (held at median)', value: 0.000 }
  ];

  return (
    <div className="panel bg-[var(--panel)] border-2 border-[var(--banana)] rounded-lg overflow-hidden mb-6 shadow-lg relative">
      {/* Header Bar */}
      <div className="phead flex justify-between items-center p-3 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider font-mono uppercase bg-[var(--banana)]/10 text-[var(--banana)]">
        <span className="font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--banana)] animate-ping" />
          PREPARING LAUNCH : PICKED FROM THE BRAIN
        </span>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[var(--fg-hi)]">DAY {String(dayIndex).padStart(3, '0')}</span>
          <span className="px-2 py-0.5 rounded bg-[var(--banana)] text-[var(--panel)] text-[0.62rem] font-black tracking-widest uppercase shadow-md animate-pulse">
            NEW
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="etop grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6 p-5 border-b border-[var(--rule)]">
        {/* Left Column: Candidate Metadata */}
        <div>
          <div className="day text-[0.64rem] tracking-widest text-[var(--dim)] mb-1 font-mono uppercase">
            DAY {String(dayIndex).padStart(3, '0')} : CYCLE {cycleId} : RUN {runId}
          </div>
          <h3 className="tname font-serif text-2xl md:text-3xl font-semibold text-[var(--fg-hi)] m-0 leading-tight">
            {name} <span className="tick text-[var(--banana)] text-sm font-mono ml-2">${symbol}</span>
          </h3>

          {/* Section 3: Authorship Disclosure Line */}
          <div className="authorship-line text-[0.7rem] text-[var(--dim)] font-mono mt-1 italic">
            {getAuthorshipText(authorship)}
          </div>

          <p className="tlore text-[var(--fg)] text-sm mt-3 max-w-[58ch] leading-relaxed font-mono">
            {lore}
          </p>

          <div className="meta flex flex-wrap gap-4 mt-4 text-[0.72rem] text-[var(--dim)] font-mono">
            <span>rank <b className="text-[var(--fg)] font-medium">{rankInCycle} of 100</b></span>
            <span>launch hour <b className="text-[var(--fg)] font-medium">{String(launchHour).padStart(2, '0')}:00 UTC</b></span>
            <span>liquidity <b className="text-[var(--fg)] font-medium">{liquidity}</b></span>
            <span>émile holds <b className="text-[var(--fg)] font-medium">0</b></span>
          </div>

          <div className="mt-4">
            <span className="status w inline-block text-[0.68rem] tracking-wider p-1.5 px-3 border border-[var(--banana)] text-[var(--banana)] font-mono font-bold uppercase rounded animate-pulse">
              {currentStatus.includes('AWAITING') ? currentStatus : 'PREPARING — AWAITING DEPLOYMENT'}
            </span>
          </div>
        </div>

        {/* Right Column: Predicted Survival & Commitment Info */}
        <div className="pred border-l border-[var(--rule)] pl-5 font-mono flex flex-col justify-center">
          <div className="lab text-[0.62rem] tracking-widest text-[var(--dim)] uppercase mb-1">
            PREDICTED SURVIVAL
          </div>
          <div className="big font-serif text-3xl md:text-4xl font-bold text-[var(--banana)] leading-none tabular-nums">
            {predictedProb.toFixed(4)}
          </div>
          
          <div className="note text-[0.66rem] text-[var(--dim)] mt-3 leading-relaxed">
            <div>
              <span className="text-[var(--dim)]">Commitment time:</span>{' '}
              <b className="text-[var(--fg)] font-mono">{formatTimestampToSecond(predictionAt)}</b>
            </div>
            <div className="mt-1">
              <span className="text-[var(--dim)] font-mono">Commitment hash:</span>
              <div className="mt-0.5">
                <code
                  onClick={() => setExpandedHash(!expandedHash)}
                  className="text-[var(--banana-lo)] bg-[var(--panel2)] p-1 px-1.5 rounded cursor-pointer select-all font-mono break-all inline-block text-[0.62rem]"
                  title="Click to toggle full SHA hash"
                >
                  {expandedHash ? predictionSha : `${predictionSha.slice(0, 16)}…`}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Contributions Section: WHY THIS ONE */}
      <div className="why bg-[var(--panel2)] p-4 px-5 border-b border-[var(--rule)] font-mono">
        <div className="lab text-[0.64rem] tracking-widest text-[var(--dim)] uppercase font-semibold mb-3">
          WHY THIS ONE : FEATURE CONTRIBUTIONS (SHAP)
        </div>

        <div className="bars grid gap-2.5 max-w-[46rem]">
          {(() => {
            const maxAbs = Math.max(0.001, ...contributions.map(c => Math.abs(c.value)));
            return contributions.map((c, idx) => {
              const isPos = c.value >= 0;
              const absVal = Math.abs(c.value);
              const widthPct = (absVal / maxAbs) * 100;
              const isZero = c.value === 0;

              return (
                <div key={idx} className="bar grid grid-cols-[1fr_auto] gap-3 items-center text-[0.72rem]">
                  <span className="t text-[var(--fg)] truncate">{c.label}</span>
                  <span className={`v tabular-nums font-medium ${isZero ? 'text-[var(--dim)]' : (isPos ? 'text-[var(--banana)]' : 'text-[var(--stall)]')}`}>
                    {isPos ? `+${c.value.toFixed(3)}` : c.value.toFixed(3)}
                  </span>
                  <div className="track col-span-2 h-[5px] bg-[var(--rule)] rounded overflow-hidden relative">
                    <div
                      className={`h-full ${isPos ? 'bg-[var(--banana-lo)]' : 'bg-[var(--stall)]'}`}
                      style={{ width: isZero ? '1px' : `${Math.max(1, widthPct).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>

        <p className="whytext text-[0.72rem] text-[var(--dim)] mt-3 max-w-[68ch] leading-relaxed">
          {data?.why_text || (
            <>
              The model selected this candidate from 100 written in The Brain. The cyclical launch terms carry the strongest signal.{' '}
              <b className="text-[var(--fg)]">Holder count is held at the dataset median for every candidate, so it cannot distinguish between them.</b>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
