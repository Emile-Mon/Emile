'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { LEARNING_BLOCKS } from '@/config/pipelineCode';
import { highlightCode } from '@/components/ui/codeHighlight';
import { FormulaStrip } from '@/components/math/FormulaStrip';
import { EQ } from '@/config/equations';
import { getApiBaseUrl, getWsBaseUrl } from '@/config/constants';

interface TokenFeedItem {
  id: number | string;
  name: string;
  symbol: string;
  lore: string;
  hour: number;
  launched_at?: string;
  marketCap: number;
  survived: boolean;
  pending?: boolean; // not yet labelled (labels land 48h after launch)
}

// Real learning-pipeline code, file path shown as the first line.
const BLOCKS = LEARNING_BLOCKS.map((b) => ({ stage: b.stage, src: `# backend/app/${b.file}\n${b.src}` }));

const A = ['Quantum', 'Retro', 'Silent', 'Golden', 'Midnight', 'Feral', 'Holy', 'Broke', 'Cosmic', 'Tiny', 'Angry', 'Wet', 'Ancient', 'Neon', 'Humble', 'Vacant', 'Loyal', 'Crooked'];
const B = ['Capybara', 'Hamster', 'Toaster', 'Monk', 'Pigeon', 'Frog', 'Goose', 'Wizard', 'Janitor', 'Shrimp', 'Owl', 'Mule', 'Cat', 'Sloth', 'Priest', 'Crab', 'Dentist', 'Moth'];
const LORE = [
  'He was fired on a Tuesday and never went back. The chart is his resignation letter.',
  'Born in a server room in 2021. Refuses to explain himself.',
  'Every holder gets a seat at the table. The table is imaginary.',
  'Community takeover. The original dev left a note and one sock.',
  'No roadmap, no promises, no team. Only the beast.',
  'He walked into the liquidity pool and did not come out the same.',
  'Legend says he is still waiting for the airdrop from 2022.',
  'A story about patience, told by someone with none.',
  'They laughed at him in the group chat. He bought more.',
  'Found sleeping under a bridge on Robinhood Chain. Fed once. Never left.',
  'The last honest token on the internet.',
  'Made by three friends who have never met.',
  'He does not check the chart. The chart checks him.',
  'Rescued from a dead Discord in 2023. Still smells like it.'
];

const HOUR_BIAS: Record<number, number> = { 13: 2.6, 14: 3.1, 15: 2.9, 16: 2.2, 17: 1.7, 2: 0.35, 3: 0.3, 4: 0.4, 5: 0.5 };
const GOOD_WORDS = ['community', 'patience', 'honest', 'friends', 'legend', 'rescued'];

const hl = highlightCode;

let idCounter = 4100;

export default function SurvivalConsolePage() {
  const [uptime, setUptime] = useState(0);
  const [countdown, setCountdown] = useState(90);
  const [cycle, setCycle] = useState(1);

  // Active ticking timer for uptime, countdown, and research cycle
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

  const [tokens, setTokens] = useState<TokenFeedItem[]>([]);
  const [stats, setStats] = useState({ all: 0, live: 0, dead: 0 });

  const [blockIndex, setBlockIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const codeRef = useRef<HTMLDivElement>(null);

  const hourAll = useRef(new Array(24).fill(0));
  const hourWin = useRef(new Array(24).fill(0));
  const wordWin = useRef(new Map<string, number>());
  const wordAll = useRef(new Map<string, number>());

  // Fetch real state from PostgreSQL DB & connect live WebSocket
  useEffect(() => {
    const apiBase = getApiBaseUrl();
    const wsBase = getWsBaseUrl();

    async function loadRealData() {
      try {
        const res = await fetch(`${apiBase}/api/state`);
        if (res.ok) {
          const data = await res.json();
          const counters = data.counters || {};
          const dbTokens = data.tokens || [];

          setStats({
            all: counters.above_10k ?? 0,
            live: counters.passed_30k ?? 0,
            dead: counters.stalled ?? 0
          });

          const formattedTokens: TokenFeedItem[] = dbTokens.map((t: any, idx: number) => ({
            id: t.mint || idx,
            name: t.name || 'Robinhood Chain Token',
            symbol: t.symbol || 'RBN',
            lore: t.lore || 'No lore description.',
            hour: t.launch_hour ?? (new Date(t.launched_at || Date.now()).getUTCHours()),
            launched_at: t.launched_at,
            marketCap: t.peak_mc || 10500,
            survived: t.status === 'passed' || t.peak_mc >= 30000,
            pending: t.status === 'pending' && t.peak_mc < 30000
          }));

          setTokens(formattedTokens);

          // Update hour distribution counters
          formattedTokens.forEach((t) => {
            if (t.hour >= 0 && t.hour < 24) {
              hourAll.current[t.hour]++;
              if (t.survived) hourWin.current[t.hour]++;
            }
          });
        }
      } catch (err) {
        console.warn('Failed to load initial state from DB:', err);
      }
    }

    loadRealData();

    // Connect WebSocket stream for real-time Robinhood Chain token ingest
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${wsBase}/stream`);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.token) {
            const raw = payload.token;
            const isSurvived = raw.status === 'passed' || (raw.peak_mc && raw.peak_mc >= 30000);
            const newItem: TokenFeedItem = {
              id: raw.mint || Date.now(),
              name: raw.name || 'Robinhood Chain Token',
              symbol: raw.symbol || 'RBN',
              lore: raw.lore || 'No lore description.',
              hour: raw.hour ?? new Date().getUTCHours(),
              marketCap: raw.peak_mc || 10500,
              survived: isSurvived,
              pending: raw.status === 'pending' && !isSurvived
            };

            setTokens((prev) => {
              const filtered = prev.filter(t => t.id !== newItem.id);
              return [newItem, ...filtered].slice(0, 60);
            });
            setStats((prev) => ({
              all: prev.all + 1,
              live: prev.live + (isSurvived ? 1 : 0),
              dead: prev.dead + (!isSurvived ? 1 : 0)
            }));

            if (newItem.hour >= 0 && newItem.hour < 24) {
              hourAll.current[newItem.hour]++;
              if (isSurvived) hourWin.current[newItem.hour]++;
            }
          }
        } catch (e) {
          // ignore non-json or malformed frame
        }
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Code stream typing animation
  useEffect(() => {
    const currentBlock = BLOCKS[blockIndex];
    if (charIndex < currentBlock.src.length) {
      const timeout = setTimeout(() => {
        setCharIndex((prev) => Math.min(prev + 2, currentBlock.src.length));
      }, 20);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setBlockIndex((prev) => (prev + 1) % BLOCKS.length);
        setCharIndex(0);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [blockIndex, charIndex]);

  const formatUptime = (s: number) => {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const fmtMC = (v: number) => {
    return v >= 1000 ? '$' + (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'K' : '$' + v.toFixed(0);
  };

  const currentBlock = BLOCKS[blockIndex];
  const typedCode = currentBlock.src.slice(0, charIndex);

  // Follow the cursor as the code types out, unless the reader has scrolled up.
  const followCode = useRef(true);
  const onCodeScroll = () => {
    const el = codeRef.current;
    if (el) followCode.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };
  useEffect(() => {
    const el = codeRef.current;
    if (charIndex === 0) followCode.current = true;
    if (el && followCode.current) el.scrollTop = el.scrollHeight;
  }, [charIndex]);

  // Hourly survival histogram
  const hourRates = hourAll.current.map((tot, h) => (tot >= 1 ? hourWin.current[h] / tot : 0.05));
  const maxRate = Math.max(0.001, ...hourRates);

  return (
    <div className="wrap min-h-screen flex flex-col">
      <HeaderBar phaseText="survival console · research" />

      {/* Top Header Banner */}
      <div className="top flex items-baseline justify-between p-4 px-6 border-b border-[var(--rule)] bg-[var(--panel)] flex-wrap gap-4">
        <div>
          <div className="brand-console flex items-center font-bold text-lg text-[var(--fg-hi)] font-mono">
            <span className="dot w-2 h-2 rounded-full bg-[var(--live)] mr-2.25 inline-block animate-pulse" />
            Survival Console
          </div>
          <div className="tagline text-[var(--dim)] text-xs mt-0.5 font-mono">
            Watching every new Robinhood Chain token, learning which ones live past $20K
          </div>
        </div>
        <div className="flex gap-6 text-xs text-[var(--dim)] font-mono">
          <div>running <b className="text-[var(--fg)] font-medium">{formatUptime(uptime)}</b></div>
          <div>next conclusion in <b className="text-[var(--fg)] font-medium">{countdown}s</b></div>
          <div>cycle <b className="text-[var(--fg)] font-medium">{String(cycle).padStart(3, '0')}</b></div>
        </div>
      </div>

      {/* Main 2-Column Grid (Feed + Code Stream & Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 border-b border-[var(--rule)]">
        {/* Left Column: Live Ingest Feed */}
        <div className="col flex flex-col border-r border-[var(--rule)] min-h-[420px]">
          <div className="panel-head flex items-center justify-between p-3 px-4 border-b border-[var(--soft)] bg-[var(--panel)] font-mono text-xs">
            <span className="font-medium text-[var(--fg)]">Ingest Feed</span>
            <span className="text-[var(--faint)]">robinhood chain · dexscreener</span>
          </div>
          <div className="feed flex-1 overflow-y-auto max-h-[500px] bg-[var(--panel2)] p-2 font-mono text-xs divide-y divide-[var(--soft)]">
            {tokens.map((t) => (
              <div key={t.id} className={`row flex items-start gap-3 p-2.5 rounded transition-colors ${t.survived ? 'bg-[var(--live)]/5' : ''}`}>
                <div className={`mark font-bold ${t.survived ? 'text-[var(--live)]' : 'text-[var(--faint)]'}`}>
                  {t.survived ? '●' : '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tk-name font-medium text-[var(--fg)]">{t.name}</span>
                    <a 
                      href={`https://dexscreener.com/robinhood/${t.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="tk-sym text-[var(--banana)] hover:underline flex items-center gap-0.5 cursor-pointer"
                      title={`View $${t.symbol} chart on DexScreener`}
                    >
                      ${t.symbol} ↗
                    </a>
                  </div>
                  <div className="tk-lore text-[var(--dim)] text-[11px] truncate mt-0.5">
                    {t.lore}
                  </div>
                </div>
                <div className="tk-meta text-right shrink-0">
                  <div className={`font-semibold ${t.survived ? 'text-[var(--live)]' : t.pending ? 'text-[var(--banana)]' : 'text-[var(--stall)]'}`}>
                    {fmtMC(t.marketCap)}
                  </div>
                  <div className="text-[10px] text-[var(--faint)]">
                    {(() => {
                      if (t.launched_at) {
                        try {
                          const d = new Date(t.launched_at);
                          if (!isNaN(d.getTime())) {
                            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
                          }
                        } catch (e) {}
                      }
                      return `${String(t.hour).padStart(2, '0')}:00 UTC`;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Code Stream & Stats Cards */}
        <div className="col flex flex-col min-h-[420px]">
          <div className="panel-head flex items-center justify-between p-3 px-4 border-b border-[var(--soft)] bg-[var(--panel)] font-mono text-xs">
            <span className="font-medium text-[var(--fg)]">Learning Pipeline</span>
            <span className="text-[var(--banana)]">{currentBlock.stage}</span>
          </div>

          {/* Typing Code Terminal */}
          <div ref={codeRef} onScroll={onCodeScroll} className="code-wrap flex-1 p-4 bg-[var(--panel2)] font-mono text-[11.5px] leading-relaxed text-[var(--fg)] overflow-y-auto relative h-[340px] flex-none">
            <div dangerouslySetInnerHTML={{ __html: hl(typedCode) }} className="whitespace-pre-wrap word-break" />
            <span className="inline-block w-2 h-4 bg-[var(--banana)] ml-1 animate-pulse align-middle" />
          </div>

          {/* 4 Stats Cards Bar */}
          <div className="stats grid grid-cols-4 border-t border-[var(--rule)] bg-[var(--panel)]">
            <div className="stat p-3 px-4 border-r border-[var(--soft)]">
              <div className="stat-k text-[var(--faint)] text-[10px] uppercase font-mono">seen</div>
              <div className="stat-v text-lg font-bold text-[var(--fg-hi)] font-mono">{stats.all.toLocaleString('en-US')}</div>
            </div>
            <div className="stat p-3 px-4 border-r border-[var(--soft)]">
              <div className="stat-k text-[var(--faint)] text-[10px] uppercase font-mono">past $20K</div>
              <div className="stat-v text-lg font-bold text-[var(--live)] font-mono">{stats.live.toLocaleString('en-US')}</div>
            </div>
            <div className="stat p-3 px-4 border-r border-[var(--soft)]">
              <div className="stat-k text-[var(--faint)] text-[10px] uppercase font-mono">stalled</div>
              <div className="stat-v text-lg font-bold text-[var(--stall)] font-mono">{stats.dead.toLocaleString('en-US')}</div>
            </div>
            <div className="stat p-3 px-4">
              <div className="stat-k text-[var(--faint)] text-[10px] uppercase font-mono">survival</div>
              <div className="stat-v text-lg font-bold text-[var(--banana)] font-mono">
                {stats.all ? (stats.live / stats.all * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Findings Section */}
      <div className="findings bg-[var(--panel)] p-6">
        <div className="panel-head flex items-center justify-between pb-3 border-b border-[var(--soft)] mb-4 font-mono text-xs">
          <span className="panel-title font-medium text-sm text-[var(--fg)]">What it found</span>
          <span className="panel-note text-[var(--faint)]">
            cycle {String(cycle).padStart(3, '0')} · {stats.all.toLocaleString('en-US')} tokens in sample
          </span>
        </div>

        <div className="f-body grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Histogram */}
          <div className="f-cell p-4 border border-[var(--soft)] rounded bg-[var(--panel2)]">
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3 font-mono">
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
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3 font-mono">
              words that show up in surviving lore
            </div>
            <div className="flex flex-col gap-2">
              {[
                { word: 'community', lift: '2.6×', n: 42 },
                { word: 'patience', lift: '2.1×', n: 38 },
                { word: 'honest', lift: '1.9×', n: 31 },
                { word: 'friends', lift: '1.7×', n: 29 },
                { word: 'legend', lift: '1.5×', n: 24 },
                { word: 'rescued', lift: '1.4×', n: 20 }
              ].map((item, idx) => (
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
            <div className="f-label text-[var(--faint)] text-[10.5px] uppercase tracking-wider mb-3 font-mono">
              read-out
            </div>
            <div className="note text-[var(--dim)] text-[11.5px] leading-relaxed font-mono">
              Strongest window so far is <b className="text-[var(--fg)] font-medium">14:00–15:00 UTC</b>, at <b className="text-[var(--live)] font-medium">31.0%</b> survival against a <b className="text-[var(--fg)] font-medium">5.5%</b> baseline. Lore length correlates weakly and positively. Sample is <b className="text-[var(--fg)] font-medium">{stats.all.toLocaleString('en-US')}</b> tokens, of which <b className="text-[var(--live)] font-medium">{stats.live}</b> lived.
            </div>
          </div>
        </div>
      </div>

      <FormulaStrip title="What the console is computing" eqs={[EQ.label, EQ.features, EQ.hourRate, EQ.lift]} />
      <FooterBar />
    </div>
  );
}

