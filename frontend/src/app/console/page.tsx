'use client';

import React, { useState, useEffect } from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';

export default function SurvivalConsolePage() {
  const [uptime, setUptime] = useState(0);
  const [countdown, setCountdown] = useState(90);
  const [cycle, setCycle] = useState(1);

  // Hourly survival bias simulated data
  const hourRates = [
    0.05, 0.04, 0.03, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.18,
    0.20, 0.26, 0.31, 0.29, 0.22, 0.17, 0.14, 0.11, 0.09, 0.07, 0.06, 0.05
  ];
  const maxRate = Math.max(...hourRates);

  const topWords = [
    { word: 'community', lift: '2.6×', n: 42 },
    { word: 'patience', lift: '2.1×', n: 38 },
    { word: 'honest', lift: '1.9×', n: 31 },
    { word: 'friends', lift: '1.7×', n: 29 },
    { word: 'legend', lift: '1.5×', n: 24 },
    { word: 'rescued', lift: '1.4×', n: 20 }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => prev + 1);
      setCountdown((prev) => {
        if (prev <= 1) {
          setCycle((c) => c + 1);
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (s: number) => {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <div className="wrap min-h-screen flex flex-col">
      <HeaderBar phaseText="survival console · research" />

      {/* Console Subheader */}
      <div className="top flex items-baseline justify-between p-4 px-6 border-b border-[var(--rule)] bg-[var(--panel)] flex-wrap gap-4">
        <div>
          <div className="brand-console flex items-center font-bold text-lg text-[#EAF1F8]">
            <span className="dot w-2 h-2 rounded-full bg-[var(--live)] mr-2.25 inline-block animate-pulse" />
            Survival Console
          </div>
          <div className="tagline text-[var(--dim)] text-xs mt-0.5">
            Watching every new Solana token, learning which ones live past $20K
          </div>
        </div>
        <div className="flex gap-6 text-xs text-[var(--dim)] font-mono">
          <div>running <b className="text-[var(--fg)] font-medium">{formatUptime(uptime)}</b></div>
          <div>next conclusion in <b className="text-[var(--fg)] font-medium">{countdown}s</b></div>
          <div>cycle <b className="text-[var(--fg)] font-medium">{String(cycle).padStart(3, '0')}</b></div>
        </div>
      </div>

      {/* Findings Panel */}
      <div className="findings border-t border-[var(--rule)] bg-[var(--panel)] p-6 flex-1">
        <div className="panel-head flex items-center justify-between pb-3 border-b border-[var(--soft)] mb-4">
          <span className="panel-title font-medium text-sm text-[#DCE6F0]">What it found</span>
          <span className="panel-note text-[var(--faint)] text-xs">
            cycle {String(cycle).padStart(3, '0')} · active sample
          </span>
        </div>

        <div className="f-body grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Histogram */}
          <div className="f-cell p-4 border border-[var(--soft)] rounded bg-[var(--panel2)]">
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3">
              survival rate by launch hour (UTC)
            </div>
            <div className="hist flex items-end gap-1 h-20 border-b border-[var(--soft)] pb-1">
              {hourRates.map((rate, h) => (
                <div key={h} className="flex-1 flex flex-col justify-end h-full">
                  <div 
                    className={`bar w-full rounded-sm transition-all duration-500 ${h === 14 ? 'bg-[var(--live)]' : 'bg-[var(--rule)]'}`}
                    style={{ height: `${Math.max(4, (rate / maxRate) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="hist-axis flex gap-1 text-[9.5px] text-[var(--faint)] mt-1.5 font-mono">
              <span className="flex-1 text-center">00</span>
              <span className="flex-1 text-center">06</span>
              <span className="flex-1 text-center">12</span>
              <span className="flex-1 text-center">18</span>
              <span className="flex-1 text-center">23</span>
            </div>
          </div>

          {/* Lore Words List */}
          <div className="f-cell p-4 border border-[var(--soft)] rounded bg-[var(--panel2)]">
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3">
              words that show up in surviving lore
            </div>
            <div className="flex flex-col gap-2">
              {topWords.map((item, idx) => (
                <div key={idx} className="kw flex items-center gap-2.5 text-xs font-mono">
                  <span className="kw-word text-[var(--fg)] min-w-[74px]">{item.word}</span>
                  <div className="h-1 bg-[var(--violet)] rounded" style={{ width: `${80 - idx * 10}px` }} />
                  <span className="kw-val text-[var(--dim)] text-[11px] ml-auto">{item.lift} · n={item.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Readout Verdict */}
          <div className="f-cell p-4 border border-[var(--soft)] rounded bg-[var(--panel2)]">
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3">
              read-out
            </div>
            <div className="note text-[var(--dim)] text-[11.5px] leading-relaxed">
              Strongest window so far is <b className="text-[var(--fg)] font-medium">14:00–15:00 UTC</b>, at <b className="text-[var(--live)] font-medium">31.0%</b> survival against a <b className="text-[var(--fg)] font-medium">5.5%</b> baseline. Lore length correlates weakly and positively.
            </div>
          </div>
        </div>
      </div>

      <FooterBar />
    </div>
  );
}
