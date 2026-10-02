'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEmileStore, TokenItem } from '@/store/useEmileStore';
import { LIVE_BLOCKS } from '@/config/pipelineCode';
import { highlightCode } from '@/components/ui/codeHighlight';

// Real ingestion code, file path shown as the first line.
const BLOCKS = LIVE_BLOCKS.map((b) => ({ stage: b.stage, src: `# backend/app/${b.file}\n${b.src}` }));
const hl = highlightCode;

const fmtMC = (v: number) => '$' + (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'K';

const formatTimestamp = (t: any) => {
  if (t && t.launched_at) {
    try {
      const date = new Date(t.launched_at);
      if (!isNaN(date.getTime())) {
        const hh = String(date.getUTCHours()).padStart(2, '0');
        const mm = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm} UTC`;
      }
    } catch (e) {
      // fallback
    }
  }
  const hh = String(t?.hour ?? 12).padStart(2, '0');
  return `${hh}:00 UTC`;
};

export const CrtTerminal: React.FC = () => {
  const stage = useEmileStore((state) => state.stage);
  const counters = useEmileStore((state) => state.counters);
  const tokens = useEmileStore((state) => state.tokens);
  const setStage = useEmileStore((state) => state.setStage);
  const addToken = useEmileStore((state) => state.addToken);
  const isConnected = useEmileStore((state) => state.isConnected);

  const [blockIdx, setBlockIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  // Live code typing loop
  useEffect(() => {
    const b = BLOCKS[blockIdx];
    setStage(b.stage);

    if (charIdx < b.src.length) {
      const timer = setTimeout(() => {
        setCharIdx((prev) => prev + 3);
      }, 18);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setBlockIdx((prev) => (prev + 1) % BLOCKS.length);
        setCharIdx(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [blockIdx, charIdx, setStage]);

  // Live code typing loop (no fake token generator)

  const currentCodeSrc = BLOCKS[blockIdx].src.slice(0, charIdx);

  // Keep the cursor in view as the real code (longer than the panel) types out.
  useEffect(() => {
    const el = codeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [charIdx]);

  return (
    <div className="screen min-h-[520px] rounded-r-lg border-l border-[var(--rule)]">
      {/* Terminal Top Bar */}
      <div className="scr-bar flex items-center gap-3 px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--panel2)] text-xs relative z-2">
        <div className="flex items-center gap-1.5">
          <span className={`lamp w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--live)] lamp-active' : 'bg-[var(--stall)]'}`} />
          <span className="t text-[var(--live)] font-mono font-medium">epoch labs : live</span>
        </div>

        <span className="r ml-auto text-[var(--dim)] font-mono text-[11px] bg-[var(--soft)] px-2.5 py-0.5 rounded border border-[var(--rule)]">
          {stage}
        </span>

        <button 
          onClick={() => setIsPaused(!isPaused)} 
          className="ml-1 px-2.5 py-1 text-[10.5px] font-mono bg-[var(--soft)] border border-[var(--border-strong)] text-[var(--live)] hover:text-[var(--banana)] hover:border-[var(--banana)] transition-all rounded cursor-pointer"
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Code Stream Display */}
      <div 
        ref={codeRef}
        className="code flex-1 min-h-[236px] max-h-[236px] overflow-hidden p-3.5 px-4.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[var(--fg)] relative z-2"
        dangerouslySetInnerHTML={{ __html: hl(currentCodeSrc) + '<span class="cur"></span>' }}
      />

      {/* Source Counters Bar */}
      <div className="pull flex gap-4 px-4.5 py-2 border-t border-b border-[var(--rule)] bg-[var(--panel2)] text-[11px] text-[var(--dim)] font-mono relative z-2">
        <span>robinhood chain <b className="text-[var(--live)] font-medium ml-1">{counters.pump}</b> pulled</span>
        <span>dexscreener <b className="text-[var(--live)] font-medium ml-1">{counters.dex}</b> priced</span>
        <span>rpc <b className="text-[var(--live)] font-medium ml-1">{counters.rpc}</b> holder counts</span>
      </div>

      {/* Realtime Token Feed Table */}
      <div className="feedbox h-[242px] overflow-hidden relative z-2">
        <div className="feedin absolute inset-0 overflow-y-auto" aria-live="polite">
          {tokens.map((t, idx) => (
            <div 
              key={t.mint + idx} 
              className="trow trow-new grid grid-cols-[22px_1.35fr_62px_74px] sm:grid-cols-[22px_1.35fr_62px_62px_74px] gap-2.5 items-center px-4.5 py-1.75 border-b border-[var(--soft)] text-[11.5px]"
            >
              <div 
                className="lg w-5 h-5 rounded-full grid place-items-center text-[8.5px] font-bold text-[var(--ink)] shadow-sm"
                style={{ backgroundColor: `hsl(${t.hue || 38} 65% 58%)` }}
              >
                {t.symbol.slice(0, 2)}
              </div>

              <div className="min-w-0">
                <span className="nm text-[var(--fg-hi)] font-medium">{t.name}</span>
                <a 
                  href={`https://dexscreener.com/robinhood/${t.mint}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="sy text-[var(--banana)] hover:underline text-[10.5px] ml-1.5 font-medium inline-flex items-center gap-0.5 cursor-pointer"
                  title={`View $${t.symbol} chart on DexScreener`}
                >
                  ${t.symbol} ↗
                </a>
                <div className="lore text-[var(--dim)] text-[10px] truncate mt-0.25">
                  {t.lore_withheld ? '[lore withheld]' : t.lore}
                </div>
              </div>

              <div
                className={`num text-right font-mono ${t.holders == null ? 'text-[var(--faint)]' : 'text-[var(--live)]'}`}
                title={t.holders == null ? 'Holders are sampled once, 48h after launch' : undefined}
              >
                {t.holders == null ? '-' : t.holders.toLocaleString('en-US')}
              </div>

              {/* Peak MC Column: Hidden on mobile (hide-sm), lore remains displayed */}
              <div className="num text-right font-mono text-[var(--live)] hide-sm">
                {fmtMC(t.peak_mc)}
                <div className="tt text-[var(--faint)] text-[9.5px] mt-0.25">{formatTimestamp(t)}</div>
              </div>

              <div className="text-right">
                <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  t.status === 'passed'
                    ? 'bg-[var(--live)]/12 text-[var(--live)] border border-[var(--live)]/30'
                    : t.status === 'stalled'
                      ? 'bg-[var(--stall)]/10 text-[var(--stall)] border border-[var(--stall)]/25'
                      : 'bg-[var(--banana)]/10 text-[var(--banana)] border border-[var(--banana)]/25'
                }`}
                  title={t.status === 'pending' ? 'Labelled 48h after launch' : undefined}
                >
                  {t.status === 'passed' ? '● 30K+' : t.status === 'stalled' ? '· stalled' : '◦ pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
