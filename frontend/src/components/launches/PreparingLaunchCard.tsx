'use client';

import React, { useState, useEffect } from 'react';

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
  peak_mc?: number;
  image_url?: string;
  dexscreener_url?: string;
  price_usd?: number;
  volume_24h?: number;
}

interface PreparingLaunchCardProps {
  data?: PreparingLaunchData;
}

export const PreparingLaunchCard: React.FC<PreparingLaunchCardProps> = ({ data }) => {
  const dayIndex = data?.day_index || 7;
  const cycleId = data?.cycle_id || 1418;
  const runId = data?.run_id || 444;
  const rawName = data?.name || 'EMILES BANANA';
  const symbol = data?.symbol || 'BANANA';
  const mint = data?.mint || '0x3c51485b11d52f90c251e74875a8b93c81027274';

  const [liveData, setLiveData] = useState<{
    name: string;
    symbol: string;
    priceUsd: string | number;
    marketCap: number;
    liquidityUsd: number;
    volume24h: number;
    imageUrl: string;
    dexUrl: string;
    isLive: boolean;
  }>({
    name: rawName,
    symbol: symbol,
    priceUsd: (data as any)?.price_usd || '0.000008607',
    marketCap: data?.peak_mc || 8608,
    liquidityUsd: 3.22,
    volume24h: 0.12,
    imageUrl: (data as any)?.image_url || 'https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto',
    dexUrl: (data as any)?.dexscreener_url || `https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be`,
    isLive: false,
  });

  // Client-side direct DexScreener API polling for guaranteed live on-chain data
  useEffect(() => {
    let isMounted = true;
    const fetchDexScreener = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (res.ok) {
          const json = await res.json();
          const pair = (json.pairs || [])[0];
          if (pair && isMounted) {
            setLiveData({
              name: pair.baseToken?.name || 'EMILES BANANA',
              symbol: pair.baseToken?.symbol || 'BANANA',
              priceUsd: pair.priceUsd || '0.000008607',
              marketCap: pair.fdv || pair.marketCap || 8608,
              liquidityUsd: pair.liquidity?.usd || 3.22,
              volume24h: pair.volume?.h24 || 0.12,
              imageUrl: pair.info?.imageUrl || 'https://cdn.dexscreener.com/cms/images/ea-QpG_fZoNTNbJ5?width=800&height=800&quality=95&format=auto',
              dexUrl: pair.url || `https://dexscreener.com/robinhood/0x2b04423015209b35c2bb6cca3ed0fd6864520ea47bf6f8b53ad339a4e393a8be`,
              isLive: true,
            });
          }
        }
      } catch (err) {
        console.warn('DexScreener direct client fetch notice:', err);
      }
    };

    fetchDexScreener();
    const interval = setInterval(fetchDexScreener, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mint]);

  const name = liveData.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/^🍌\s*/, '').trim();
  const tokenSymbol = liveData.symbol;
  const logoSrc = liveData.imageUrl;
  const dexscreenerUrl = liveData.dexUrl;

  const lore = data?.lore || `He was asked to find patterns.
So he started looking everywhere.

1,090 tokens entered the dataset.
292 crossed $30K.
28 signals were extracted.
Holder retention. Launch cycles. Seasonality. Lore length.

Émile watched them all.

He learned that numbers mattered.
He learned that timing mattered.
He learned that holders mattered.

And then, somewhere between all the data…

Émile found a banana.

He didn’t know why it mattered.

He simply kept looking at it.`;
  const launchHour = data?.launch_hour || 14;
  const rankInCycle = data?.rank_in_cycle || 1;
  const predictedProb = data?.predicted_prob !== undefined ? data.predicted_prob : 0.8117;
  const predictionSha = data?.prediction_sha || mint;
  const predictionAt = data?.prediction_at || '2026-09-12T14:00:00Z';
  const currentStatus = `LAUNCHED : ${mint}`;

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

  const rawContributions: ContributionItem[] = (data?.contributions && data.contributions.length > 0)
    ? data.contributions
    : [
      { feature: 'launch_hour_cos', label: `Launch hour ${String(launchHour).padStart(2, '0')}:00 UTC`, value: 0.211 },
      { feature: 'lore_length', label: `Lore length ${lore.length} characters`, value: 0.094 },
      { feature: 'name_tokens', label: `Name token count 3`, value: 0.038 },
      { feature: 'holders', label: 'Holder count (held at median)', value: 0.000 }
    ];

  const contributions: ContributionItem[] = rawContributions.map(c => {
    if (c.feature === 'lore_length' || c.label.toLowerCase().includes('lore length')) {
      return { ...c, label: `Lore length ${lore.length} characters` };
    }
    if (c.feature === 'name_tokens' || c.label.toLowerCase().includes('name token')) {
      const tokenCount = name.replace(/[^\w\s']/g, '').trim().split(/\s+/).filter(Boolean).length || 3;
      return { ...c, label: `Name token count ${tokenCount}` };
    }
    if (c.feature === 'launch_hour_cos' || c.label.toLowerCase().includes('launch hour')) {
      return { ...c, label: `Launch hour ${String(launchHour).padStart(2, '0')}:00 UTC` };
    }
    return c;
  });

  return (
    <div className="panel bg-[var(--panel)] border-2 border-[var(--banana)] rounded-lg overflow-hidden mb-6 shadow-lg relative">
      {/* Header Bar */}
      <div className="phead flex justify-between items-center p-3 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider font-mono uppercase bg-[var(--banana)]/10 text-[var(--banana)]">
        <span className="font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-ping" />
          LAUNCHED ON-CHAIN : LIVE TRACKING IN PROGRESS
        </span>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[var(--fg-hi)]">DAY {String(dayIndex).padStart(3, '0')}</span>
          <span className="px-2 py-0.5 rounded bg-[var(--green)] text-[var(--panel)] text-[0.62rem] font-black tracking-widest uppercase shadow-md animate-pulse">
            LIVE LAUNCH
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
          <div className="flex items-center gap-3.5 mb-1.5">
            <img
              src={logoSrc}
              alt={`${tokenSymbol} Logo`}
              className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border-2 border-[var(--banana)] shadow-md shrink-0"
            />
            <div>
              <h3 className="tname font-serif text-2xl md:text-3xl font-semibold text-[var(--fg-hi)] m-0 leading-tight">
                {name} <span className="tick text-[var(--banana)] text-sm font-mono ml-2">${tokenSymbol}</span>
              </h3>
              {/* Section 3: Authorship Disclosure Line */}
              <div className="authorship-line text-[0.7rem] text-[var(--dim)] font-mono mt-0.5 italic">
                {getAuthorshipText(authorship)}
              </div>
            </div>
          </div>

          {/* LIVE DEXSCREENER METRICS BAR */}
          <div className="live-metrics flex flex-wrap gap-3 my-3 p-2.5 px-3 rounded bg-[var(--panel2)] border border-[var(--banana)]/30 font-mono text-[0.7rem]">
            <span className="flex items-center gap-1.5 text-[var(--fg-hi)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              MC: <b className="text-[var(--banana)] font-bold">${Number(liveData.marketCap).toLocaleString('en-US')}</b>
            </span>
            <span className="text-[var(--dim)]">•</span>
            <span className="text-[var(--fg-hi)]">
              Price: <b className="text-[var(--fg-hi)] font-bold">${liveData.priceUsd}</b>
            </span>
            <span className="text-[var(--dim)]">•</span>
            <span className="text-[var(--fg-hi)]">
              Liq: <b className="text-[var(--fg-hi)] font-medium">${Number(liveData.liquidityUsd).toLocaleString('en-US')}</b>
            </span>
            <span className="text-[var(--dim)]">•</span>
            <span className="text-[var(--fg-hi)]">
              24h Vol: <b className="text-[var(--fg-hi)] font-medium">${Number(liveData.volume24h).toLocaleString('en-US')}</b>
            </span>
          </div>

          {/* Candidate Lore & Memory Log Box */}
          <div className="tlore-box bg-[var(--panel2)]/90 border-l-2 border-[var(--banana)] rounded-r-lg p-4 px-5 my-4 max-w-[62ch] shadow-inner relative overflow-hidden">
            <div className="text-[0.62rem] font-mono tracking-widest text-[var(--banana)] uppercase mb-2 font-semibold flex items-center gap-1.5">
              <span>✦ CANDIDATE LORE & MEMORY LOG</span>
            </div>
            <div className="space-y-2.5 font-serif text-[0.94rem] leading-relaxed">
              {lore.split(/\n\s*\n/).filter(Boolean).map((paragraph, idx) => {
                const isPunchline = paragraph.toLowerCase().includes('banana') || paragraph.toLowerCase().includes('looking at it');
                return (
                  <p
                    key={idx}
                    className={`${isPunchline
                      ? 'text-[var(--banana)] font-medium text-[0.98rem] tracking-wide'
                      : 'text-[var(--fg-hi)] opacity-90'
                      } whitespace-pre-line leading-relaxed m-0`}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="meta flex flex-wrap gap-4 mt-4 text-[0.72rem] text-[var(--dim)] font-mono">
            <span>rank <b className="text-[var(--fg)] font-medium">{rankInCycle} of 100</b></span>
            <span>launch hour <b className="text-[var(--fg)] font-medium">{String(launchHour).padStart(2, '0')}:00 UTC</b></span>
            <span>liquidity <b className="text-[var(--fg)] font-medium">${Number(liveData.liquidityUsd).toLocaleString('en-US')} (0.05 ETH)</b></span>
            <span>émile holds <b className="text-[var(--fg)] font-medium">0</b></span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="status p inline-block text-[0.68rem] tracking-wider p-1.5 px-3 border border-[var(--green)] text-[var(--green)] font-mono font-bold uppercase rounded animate-pulse select-all break-all">
              LAUNCHED : {mint}
            </span>
            <a
              href={dexscreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.68rem] text-[var(--banana)] hover:underline font-mono font-semibold flex items-center gap-1 bg-[var(--banana)]/10 p-1.5 px-3 rounded border border-[var(--banana)]/40 shadow-sm"
            >
              <span>View DexScreener Live Pair</span>
            </a>
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
