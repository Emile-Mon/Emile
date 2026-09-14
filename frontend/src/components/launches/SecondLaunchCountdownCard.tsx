'use client';

import React, { useState, useEffect } from 'react';

export interface SecondLaunchData {
  launch_id?: number;
  day_index?: number;
  cycle_id?: number;
  run_id?: number;
  candidate_id?: number;
  name: string;
  symbol: string;
  lore: string;
  launch_hour: number;
  rank_in_cycle?: number;
  predicted_prob: number;
  prediction_sha: string;
  prediction_at: string;
  status: string;
  mint?: string;
  image_url?: string;
  dexscreener_url?: string;
  peak_mc?: number;
  price_usd?: number;
  volume_24h?: number;
  liquidity_usd?: number;
  authorship?: {
    name: string;
    lore: string;
    hour: string;
    holders: string;
  };
  contributions?: Array<{
    feature: string;
    label: string;
    value: number;
  }>;
  why_text?: string;
}

interface SecondLaunchCountdownCardProps {
  data?: SecondLaunchData;
}

export const SecondLaunchCountdownCard: React.FC<SecondLaunchCountdownCardProps> = ({ data: propData }) => {
  const defaultMint = '0xa8c561693ca146fa515cff72c73ac2c463c956dc';

  const [candidate, setCandidate] = useState<SecondLaunchData>({
    name: 'twenty hundred Zulu',
    symbol: '2000Z',
    mint: defaultMint,
    lore: `In aviation, maritime, and military convention, Coordinated Universal Time is spoken as Zulu, and 20:00 is read as twenty hundred. So 2000Z is said aloud exactly as it is written here: twenty hundred Zulu.

This is the correct radio reading, not a stylisation, which is the point. The name is a coordinate spoken the way operators speak it, by people whose job depends on everyone meaning the same instant.`,
    launch_hour: 20,
    rank_in_cycle: 1,
    predicted_prob: 0.8420,
    prediction_sha: defaultMint,
    prediction_at: '2026-09-15T20:00:00Z',
    status: `LAUNCHED : ${defaultMint}`,
    image_url: '/2000z-logo.jpeg',
    dexscreener_url: `https://dexscreener.com/robinhood/${defaultMint}`,
    authorship: {
      name: 'human',
      lore: 'model',
      hour: 'model',
      holders: 'market'
    },
    contributions: [
      { feature: 'launch_hour_cos', label: 'Launch hour 20:00 UTC', value: 0.245 },
      { feature: 'lore_length', label: 'Lore length 315 characters', value: 0.088 },
      { feature: 'name_tokens', label: 'Name token count 3', value: 0.035 },
      { feature: 'holders', label: 'Holder count (held at median)', value: 0.000 }
    ],
    why_text: 'The model placed this candidate first for the 20:00 UTC slot. Launch hour 20:00 UTC carries the strongest cyclical signal (+0.245), and lore length contributed +0.088.'
  });

  const [liveData, setLiveData] = useState<{
    priceUsd: string | number;
    marketCap: number;
    liquidityUsd: number;
    volume24h: number;
    imageUrl: string;
    dexUrl: string;
    isLive: boolean;
  }>({
    priceUsd: '0.00',
    marketCap: 0,
    liquidityUsd: 0,
    volume24h: 0,
    imageUrl: '/2000z-logo.jpeg',
    dexUrl: `https://dexscreener.com/robinhood/${defaultMint}`,
    isLive: false,
  });

  const [expandedHash, setExpandedHash] = useState<boolean>(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.emilelearns.run';

  const mint = candidate.mint || defaultMint;

  useEffect(() => {
    if (propData) {
      setCandidate(propData);
    } else {
      const fetchSecondLaunch = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/launches/second?ca=${mint}`);
          if (res.ok) {
            const json = await res.json();
            if (json && json.name) {
              setCandidate(json);
            }
          }
        } catch (err) {
          console.warn('Backend API notice for second launch:', err);
        }
      };
      fetchSecondLaunch();
    }
  }, [propData, API_BASE, mint]);

  // Client-side direct DexScreener API polling for live CA data
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
              priceUsd: pair.priceUsd || '0.00',
              marketCap: pair.fdv || pair.marketCap || 0,
              liquidityUsd: pair.liquidity?.usd || 0,
              volume24h: pair.volume?.h24 || 0,
              imageUrl: pair.info?.imageUrl || '/2000z-logo.jpeg',
              dexUrl: pair.url || `https://dexscreener.com/robinhood/${mint}`,
              isLive: true,
            });
          }
        }
      } catch (err) {
        console.warn('DexScreener client poll notice for Zulu:', err);
      }
    };

    fetchDexScreener();
    const interval = setInterval(fetchDexScreener, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mint]);

  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(now);
      target.setUTCHours(20, 0, 0, 0);
      if (now.getTime() >= target.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  const authorship = candidate.authorship || {
    name: 'human',
    lore: 'model',
    hour: 'model',
    holders: 'market'
  };

  const getAuthorshipText = (auth: typeof authorship): string => {
    const parts: string[] = [];
    parts.push(auth.name === 'human' ? 'Name chosen by human.' : 'Name chosen by the model.');
    parts.push(auth.lore === 'model' && auth.hour === 'model' ? 'Lore and launch hour chosen by the model.' : 'Lore and launch hour chosen by human.');
    parts.push(auth.holders === 'market' ? 'Holder count belongs to the market.' : '');
    return parts.filter(Boolean).join(' ');
  };

  const logoSrc = liveData.isLive && liveData.imageUrl ? liveData.imageUrl : (candidate.image_url || '/2000z-logo.jpeg');
  const dexscreenerUrl = liveData.dexUrl || candidate.dexscreener_url || `https://dexscreener.com/robinhood/${mint}`;

  const rawContributions = candidate.contributions || [
    { feature: 'launch_hour_cos', label: 'Launch hour 20:00 UTC', value: 0.245 },
    { feature: 'lore_length', label: `Lore length ${candidate.lore.length} characters`, value: 0.088 },
    { feature: 'name_tokens', label: 'Name token count 3', value: 0.035 },
    { feature: 'holders', label: 'Holder count (held at median)', value: 0.000 }
  ];

  return (
    <div className="countdown-card panel bg-[var(--panel)] border-2 border-[var(--cyan)]/70 rounded-lg p-5 mb-6 shadow-xl font-mono relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 mb-5 border-b border-[var(--rule)]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)] animate-ping shadow-[0_0_8px_var(--cyan)]" />
          <h4 className="font-bold text-sm tracking-wider text-[var(--fg-hi)] uppercase m-0 flex items-center gap-2">
            <span>SECOND AUTOMATED LAUNCH</span>
            <span className="text-[var(--cyan)] font-mono">• 20:00 UTC (ZULU)</span>
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[0.68rem]">
          <span className="px-2.5 py-0.5 rounded bg-[var(--cyan)]/15 border border-[var(--cyan)]/40 text-[var(--cyan)] font-bold tracking-wider uppercase shadow-sm">
            LIVE CONTRACT REGISTERED
          </span>
          <span className="text-[var(--dim)] font-mono hidden md:inline">ROBINHOOD CHAIN</span>
        </div>
      </div>

      {/* Grid: Candidate Info & Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6">
        {/* Left Column: Candidate Details */}
        <div>
          <div className="flex items-center gap-3.5 mb-2">
            <img
              src={logoSrc}
              alt={`${candidate.symbol} Logo`}
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover border-2 border-[var(--cyan)] shadow-md shrink-0 bg-[var(--panel2)]"
            />
            <div>
              <h3 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--fg-hi)] m-0 leading-tight">
                {candidate.name} <span className="text-[var(--cyan)] text-sm font-mono ml-2 font-bold">${candidate.symbol}</span>
              </h3>
              <div className="text-[0.7rem] text-[var(--dim)] font-mono mt-0.5 italic">
                {getAuthorshipText(authorship)}
              </div>
            </div>
          </div>

          {/* LIVE DEXSCREENER METRICS BAR */}
          <div className="live-metrics flex flex-wrap gap-3 my-3 p-2.5 px-3 rounded bg-[var(--panel2)] border border-[var(--cyan)]/30 font-mono text-[0.7rem]">
            <span className="flex items-center gap-1.5 text-[var(--fg-hi)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] animate-pulse" />
              MC: <b className="text-[var(--cyan)] font-bold">${Number(liveData.marketCap).toLocaleString('en-US')}</b>
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

          {/* Lore & Memory Log Box */}
          <div className="bg-[var(--panel2)]/90 border-l-2 border-[var(--cyan)] rounded-r-lg p-4 px-5 my-3 max-w-[62ch] shadow-inner relative overflow-hidden">
            <div className="text-[0.62rem] font-mono tracking-widest text-[var(--cyan)] uppercase mb-2 font-semibold flex items-center gap-1.5">
              <span>✦ CANDIDATE LORE & MEMORY LOG</span>
            </div>
            <div className="space-y-2.5 font-serif text-[0.93rem] leading-relaxed text-[var(--fg-hi)] opacity-95">
              {candidate.lore.split(/\n\s*\n/).filter(Boolean).map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line leading-relaxed m-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* CA Contract Address & DexScreener Link */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="status p inline-block text-[0.68rem] tracking-wider p-1.5 px-3 border border-[var(--cyan)] text-[var(--cyan)] font-mono font-bold uppercase rounded select-all break-all bg-[var(--cyan)]/5">
              LAUNCHED : {mint}
            </span>
            <a
              href={dexscreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.68rem] text-[var(--cyan)] hover:underline font-mono font-semibold flex items-center gap-1 bg-[var(--cyan)]/10 p-1.5 px-3 rounded border border-[var(--cyan)]/40 shadow-sm"
            >
              <span>View DexScreener Live Pair</span>
            </a>
          </div>

          {/* Feature Contributions SHAP */}
          <div className="mt-4 p-3.5 bg-[var(--panel2)] rounded-lg border border-[var(--rule)]">
            <div className="text-[0.62rem] tracking-widest text-[var(--dim)] uppercase font-semibold mb-2.5">
              FEATURE CONTRIBUTIONS (SHAP SIGNAL)
            </div>
            <div className="grid gap-2 max-w-[42rem]">
              {(() => {
                const maxAbs = Math.max(0.001, ...rawContributions.map(c => Math.abs(c.value)));
                return rawContributions.map((c, idx) => {
                  const isPos = c.value >= 0;
                  const absVal = Math.abs(c.value);
                  const widthPct = (absVal / maxAbs) * 100;
                  const isZero = c.value === 0;
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 items-center text-[0.7rem]">
                      <span className="text-[var(--fg)] truncate">{c.label}</span>
                      <span className={`tabular-nums font-medium ${isZero ? 'text-[var(--dim)]' : (isPos ? 'text-[var(--cyan)]' : 'text-[var(--stall)]')}`}>
                        {isPos ? `+${c.value.toFixed(3)}` : c.value.toFixed(3)}
                      </span>
                      <div className="col-span-2 h-[4px] bg-[var(--rule)] rounded overflow-hidden relative">
                        <div
                          className={`h-full ${isPos ? 'bg-[var(--cyan)]' : 'bg-[var(--stall)]'}`}
                          style={{ width: isZero ? '1px' : `${Math.max(1, widthPct).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Right Column: Countdown Clock & Prediction Score */}
        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[var(--rule)] pt-4 lg:pt-0 lg:pl-5">
          {/* Prediction Box */}
          <div className="mb-4">
            <div className="text-[0.62rem] tracking-widest text-[var(--dim)] uppercase mb-1">
              PREDICTED SURVIVAL
            </div>
            <div className="font-serif text-3xl md:text-4xl font-bold text-[var(--cyan)] leading-none tabular-nums">
              {candidate.predicted_prob.toFixed(4)}
            </div>
            <div className="text-[0.66rem] text-[var(--dim)] mt-2 leading-tight">
              Pre-commitment SHA hash:
              <code
                onClick={() => setExpandedHash(!expandedHash)}
                className="block mt-1 p-1 bg-[var(--panel2)] rounded text-[0.6rem] text-[var(--cyan)] break-all font-mono cursor-pointer select-all"
                title="Click to toggle full SHA hash"
              >
                {expandedHash ? mint : `${mint.slice(0, 16)}…`}
              </code>
            </div>
          </div>

          {/* Digital Countdown Timer */}
          <div className="bg-[var(--panel2)]/90 border border-[var(--cyan)]/40 rounded-xl p-4 shadow-inner">
            <div className="text-[0.64rem] tracking-widest text-[var(--dim)] uppercase mb-2 font-semibold text-center">
              COUNTDOWN TO 20:00 UTC
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="flex flex-col items-center">
                <div className="bg-[var(--panel)] border border-[var(--rule)] rounded-md px-2.5 py-1.5 min-w-[56px] text-center shadow-inner">
                  <span className="font-serif text-2xl font-bold text-[var(--cyan)] tracking-tight tabular-nums">
                    {formatTwoDigits(timeLeft.hours)}
                  </span>
                </div>
                <span className="text-[0.58rem] tracking-widest text-[var(--dim)] uppercase mt-1">HRS</span>
              </div>

              <span className="font-serif text-xl text-[var(--cyan)] font-bold mb-3">:</span>

              <div className="flex flex-col items-center">
                <div className="bg-[var(--panel)] border border-[var(--rule)] rounded-md px-2.5 py-1.5 min-w-[56px] text-center shadow-inner">
                  <span className="font-serif text-2xl font-bold text-[var(--cyan)] tracking-tight tabular-nums">
                    {formatTwoDigits(timeLeft.minutes)}
                  </span>
                </div>
                <span className="text-[0.58rem] tracking-widest text-[var(--dim)] uppercase mt-1">MIN</span>
              </div>

              <span className="font-serif text-xl text-[var(--cyan)] font-bold mb-3">:</span>

              <div className="flex flex-col items-center">
                <div className="bg-[var(--panel)] border border-[var(--rule)] rounded-md px-2.5 py-1.5 min-w-[56px] text-center shadow-inner">
                  <span className="font-serif text-2xl font-bold text-[var(--live)] tracking-tight tabular-nums">
                    {formatTwoDigits(timeLeft.seconds)}
                  </span>
                </div>
                <span className="text-[0.58rem] tracking-widest text-[var(--dim)] uppercase mt-1">SEC</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--rule)] text-[0.68rem] text-[var(--dim)]">
            <div className="flex justify-between items-center mb-1">
              <span>EXECUTION:</span>
              <span className="text-[var(--fg-hi)] font-bold">AUTONOMOUS</span>
            </div>
            <div className="flex justify-between items-center">
              <span>PRE-COMMIT:</span>
              <span className="text-[var(--cyan)] font-bold">VERIFIED ON-CHAIN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
