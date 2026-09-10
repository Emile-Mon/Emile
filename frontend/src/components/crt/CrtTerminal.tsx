'use client';

import React, { useState, useEffect } from 'react';
import { useEmileStore, TokenItem } from '@/store/useEmileStore';

const BLOCKS = [
  {
    stage: 'ingest · pump.fun',
    src: `# every mint from the launchpad, winners and losers alike
new = pumpfun.tokens(since=cursor, limit=500)
keep = new[new.peak_mc >= 10_000]          # the gate
log(f"{len(new)} seen, {len(keep)} above the line")`
  },
  {
    stage: 'pricing · dexscreener',
    src: `# peak cap, never the current cap — a token that touched
# 25K and fell back to 8K still crossed the gate
pairs = dexscreener.pairs(chain="solana", tokens=keep.mint)
keep = keep.join(pairs[["peak_mc","liq","image_url"]], on="mint")`
  },
  {
    stage: 'holders · rpc',
    src: `# the only feature that needs the chain itself
accs = rpc.get_program_accounts(TOKEN_PROGRAM, filters=[
    {"dataSize": 165},
    {"memcmp": {"offset": 0, "bytes": mint}},
])
keep["holders"] = sum(1 for a in accs if a.amount > 0)`
  },
  {
    stage: 'features',
    src: `X = pd.DataFrame(index=df.index)
X["hour_sin"] = np.sin(2*np.pi * df.launch_hour / 24)
X["hour_cos"] = np.cos(2*np.pi * df.launch_hour / 24)
X["holders"]  = np.log1p(df.holders)
X["lore_len"] = df.lore.str.split().str.len()
X = np.hstack([X.values, PCA(24).fit_transform(encode(df.lore))])`
  },
  {
    stage: 'training',
    src: `y = (df.peak_mc >= 30_000).astype(int)
clf = LGBMClassifier(n_estimators=400, learning_rate=0.03,
                     class_weight="balanced", min_child_samples=40)
auc = cross_val_score(clf, X, y, cv=StratifiedKFold(5), scoring="roc_auc")
log(f"roc_auc {auc.mean():.3f} +/- {auc.std():.3f}")`
  },
  {
    stage: 'the jar',
    src: `eps   = sqrt((d*(log(2*n/d)+1) + log(4/delta)) / n)
floor = auc.mean() - eps

if floor >= 0.60:
    jar.fill(); agent.unlock("launch")
else:
    log(f"floor {floor:.3f} — not yet. keep reading.")`
  }
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOK = /(#[^\n]*)|("(?:[^"\\]|\\.)*")|\b(import|from|if|else|for|in|return|def|not|and|or|as|True|False|None|sum)\b|\b(\d[\d_.]*)\b/g;

function hl(src: string): string {
  let out = '', last = 0, m: RegExpExecArray | null;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(src)) !== null) {
    out += esc(src.slice(last, m.index));
    if (m[1])      out += '<span class="c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="k">' + esc(m[3]) + '</span>';
    else          out += '<span class="n">' + esc(m[4]) + '</span>';
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

const fmtMC = (v: number) => '$' + (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'K';

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

  // Live code typing loop
  useEffect(() => {
    const b = BLOCKS[blockIdx];
    setStage(b.stage);

    if (charIdx < b.src.length) {
      const timer = setTimeout(() => {
        setCharIdx((prev) => prev + 2);
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

  return (
    <div className="screen min-h-[520px] rounded-r-lg border-l border-[var(--rule)]">
      {/* Terminal Top Bar */}
      <div className="scr-bar flex items-center gap-3 px-4 py-2.5 border-b border-[#14261C] bg-[#09120D] text-xs relative z-2">
        <div className="flex items-center gap-1.5">
          <span className={`lamp w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--live)] lamp-active' : 'bg-[var(--stall)]'}`} />
          <span className="t text-[#9ED8B3] font-mono font-medium">emile@surely — live</span>
        </div>

        <span className="r ml-auto text-[#4E755D] font-mono text-[11px] bg-[#0E1F16] px-2.5 py-0.5 rounded border border-[#163625]">
          {stage}
        </span>

        <button 
          onClick={() => setIsPaused(!isPaused)} 
          className="ml-1 px-2.5 py-1 text-[10.5px] font-mono bg-[#0E1F16] border border-[#1C452E] text-[#9ED8B3] hover:text-[var(--banana)] hover:border-[var(--banana)] transition-all rounded cursor-pointer"
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Code Stream Display */}
      <div 
        className="code flex-1 min-h-[236px] max-h-[236px] overflow-hidden p-3.5 px-4.5 font-mono text-xs leading-relaxed white-space-pre-wrap color-[#A4CBB1] relative z-2"
        dangerouslySetInnerHTML={{ __html: hl(currentCodeSrc) + '<span class="cur"></span>' }}
      />

      {/* Source Counters Bar */}
      <div className="pull flex gap-4 px-4.5 py-2 border-t border-b border-[#14261C] bg-[#09120D] text-[11px] text-[#4E7360] font-mono relative z-2">
        <span>pump.fun <b className="text-[#A7E2BD] font-medium ml-1">{counters.pump}</b> pulled</span>
        <span>dexscreener <b className="text-[#A7E2BD] font-medium ml-1">{counters.dex}</b> priced</span>
        <span>rpc <b className="text-[#A7E2BD] font-medium ml-1">{counters.rpc}</b> holder counts</span>
      </div>

      {/* Realtime Token Feed Table */}
      <div className="feedbox h-[242px] overflow-hidden relative z-2">
        <div className="feedin absolute inset-0 overflow-y-auto" aria-live="polite">
          {tokens.map((t, idx) => (
            <div 
              key={t.mint + idx} 
              className="trow trow-new grid grid-cols-[22px_1.35fr_62px_74px] sm:grid-cols-[22px_1.35fr_62px_62px_74px] gap-2.5 items-center px-4.5 py-1.75 border-b border-[#0E1B15] text-[11.5px]"
            >
              <div 
                className="lg w-5 h-5 rounded-full grid place-items-center text-[8.5px] font-bold text-[#060D09] shadow-sm"
                style={{ backgroundColor: `hsl(${t.hue || 38} 65% 58%)` }}
              >
                {t.symbol.slice(0, 2)}
              </div>

              <div className="min-w-0">
                <span className="nm text-[#E3F2E9] font-medium">{t.name}</span>
                <span className="sy text-[var(--banana)] text-[10.5px] ml-1.5 font-medium">${t.symbol}</span>
                <div className="lore text-[#5A826D] text-[10px] truncate mt-0.25">
                  {t.lore_withheld ? '[lore withheld]' : t.lore}
                </div>
              </div>

              <div className="num text-right font-mono text-[#9ED8B3]">{t.holders.toLocaleString()}</div>

              {/* Peak MC Column: Hidden on mobile (hide-sm), lore remains displayed */}
              <div className="num text-right font-mono text-[#9ED8B3] hide-sm">
                {fmtMC(t.peak_mc)}
                <div className="tt text-[#41614E] text-[9.5px] mt-0.25">{String(t.hour).padStart(2, '0')}:00 UTC</div>
              </div>

              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  t.status === 'passed' 
                    ? 'bg-[rgba(52,211,153,0.12)] text-[var(--live)] border border-[rgba(52,211,153,0.3)] glow-live' 
                    : 'bg-[rgba(248,113,113,0.1)] text-[var(--stall)] border border-[rgba(248,113,113,0.25)]'
                }`}>
                  {t.status === 'passed' ? '● 30K+' : '· stalled'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
