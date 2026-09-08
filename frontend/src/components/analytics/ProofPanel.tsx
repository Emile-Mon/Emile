'use client';

import React from 'react';
import { useEmileStore } from '@/store/useEmileStore';

const DELTA = 0.05;
const TARGET = 0.60;
const FLOOR = 0.50;

const epsilon = (n: number, d: number) => {
  if (n <= d) return 1.0;
  return Math.sqrt((d * (Math.log((2 * n) / d) + 1) + Math.log(4 / DELTA)) / n);
};

const floorOf = (a: number, n: number, d: number) => Math.max(FLOOR, a - epsilon(n, d));

export const ProofPanel: React.FC = () => {
  const simState = useEmileStore((state) => state.simState);
  const setSimParams = useEmileStore((state) => state.setSimParams);
  const resetSim = useEmileStore((state) => state.resetSim);
  const model = useEmileStore((state) => state.model);

  const { n, auc, d, running } = simState;
  const e = epsilon(n, d);
  const lb = floorOf(auc, n, d);
  const lvl = Math.max(0, Math.min(1, (lb - FLOOR) / (TARGET - FLOOR)));

  const isReady = lvl >= 1.0;

  return (
    <div className="proof proof-grid border-t border-[var(--rule)] grid grid-cols-2 bg-[var(--panel)]">
      {/* Left Column: Theory Explanation */}
      <div className="pc p-5 md:p-6 border-r border-[var(--soft)]">
        <div className="ph font-serif text-lg font-bold text-[#F1F6FA] tracking-tight">
          Why the jar fills slowly
        </div>
        <div className="pp text-[var(--dim)] text-[12px] mt-2 leading-relaxed">
          A model can look good by luck on a small sample. Vapnik–Chervonenkis theory puts a number on that luck: with <b className="text-[var(--fg)] font-medium">n</b> tokens and a model of capacity <b className="text-[var(--fg)] font-medium">d</b>, the true score can sit below the measured one by at most ε, with 95% confidence.
        </div>

        <div className="formula bg-[var(--panel2)] border border-[var(--rule)] rounded-lg p-4 text-center text-sm text-[#E2EBF5] my-4 shadow-inner">
          <span className="eps text-[var(--violet)] font-bold glow-violet">ε</span> = <span className="rad border-t border-[var(--dim)] pt-0.75 px-1.5 -ml-0.5">√<span className="frac inline-block align-middle text-center mx-0.5"><span className="nu block px-2 pb-0.5 border-b border-[var(--dim)] text-[11.5px]">d(ln <span className="vv text-[var(--banana)] font-medium">2n</span>/d + 1) + ln 4/δ</span><span className="de block pt-0.5 text-[11.5px]">n</span></span></span>
        </div>

        <div className="pp text-[var(--dim)] text-[12px] mt-2 leading-relaxed">
          Émile fills the jar with <b className="text-[var(--fg)] font-medium">AUC − ε</b>, never with the raw score. Good model, thin sample: jar stays empty. That is the point.
        </div>
      </div>

      {/* Right Column: Readouts, Sliders & Verdict */}
      <div className="pc p-5 md:p-6">
        <div className="ros grid grid-cols-3 border border-[var(--soft)] rounded-lg overflow-hidden shadow-sm">
          <div className="ro p-3 px-3.5 bg-[var(--panel2)]">
            <div className="ro-k text-[var(--faint)] text-[10px] font-mono uppercase tracking-wider">measured AUC</div>
            <div className="ro-v font-serif text-xl font-bold text-[var(--live)] tracking-tight glow-live">{auc.toFixed(3)}</div>
          </div>
          <div className="ro p-3 px-3.5 bg-[var(--panel2)] border-l border-[var(--soft)]">
            <div className="ro-k text-[var(--faint)] text-[10px] font-mono uppercase tracking-wider">penalty ε</div>
            <div className="ro-v font-serif text-xl font-bold text-[var(--violet)] tracking-tight">{e >= 1 ? '—' : e.toFixed(3)}</div>
          </div>
          <div className="ro p-3 px-3.5 bg-[var(--panel2)] border-l border-[var(--soft)]">
            <div className="ro-k text-[var(--faint)] text-[10px] font-mono uppercase tracking-wider">proven floor</div>
            <div className="ro-v font-serif text-xl font-bold text-[var(--banana)] tracking-tight glow-banana">{lb.toFixed(3)}</div>
          </div>
        </div>

        {/* Sliders */}
        <div className="ctrl flex flex-col gap-3 mt-4">
          <div className="sr grid grid-cols-[110px_1fr_58px] gap-2.5 items-center">
            <label htmlFor="sn" className="text-[var(--dim)] text-[11px] font-mono">tokens sampled</label>
            <input 
              type="range" 
              id="sn" 
              min="120" 
              max="24000" 
              step="20" 
              value={n} 
              onChange={(e) => setSimParams({ n: Number(e.target.value) })}
            />
            <output className="text-right text-[11.5px] font-mono font-medium text-[var(--fg)]">{n.toLocaleString()}</output>
          </div>

          <div className="sr grid grid-cols-[110px_1fr_58px] gap-2.5 items-center">
            <label htmlFor="sa" className="text-[var(--dim)] text-[11px] font-mono">measured AUC</label>
            <input 
              type="range" 
              id="sa" 
              min="0.5" 
              max="0.85" 
              step="0.001" 
              value={auc} 
              onChange={(e) => setSimParams({ auc: Number(e.target.value) })}
            />
            <output className="text-right text-[11.5px] font-mono font-medium text-[var(--fg)]">{auc.toFixed(3)}</output>
          </div>

          <div className="sr grid grid-cols-[110px_1fr_58px] gap-2.5 items-center">
            <label htmlFor="sd" className="text-[var(--dim)] text-[11px] font-mono">model capacity d</label>
            <input 
              type="range" 
              id="sd" 
              min="4" 
              max="80" 
              step="1" 
              value={d} 
              onChange={(e) => setSimParams({ d: Number(e.target.value) })}
            />
            <output className="text-right text-[11.5px] font-mono font-medium text-[var(--fg)]">{d}</output>
          </div>
        </div>

        {/* Verdict Line */}
        <div className={`verdict mt-4 p-3.5 rounded-lg border text-[11.5px] leading-relaxed transition-all duration-300 ${
          isReady 
            ? 'border-[var(--banana)] text-[var(--banana)] bg-[rgba(242,201,76,0.06)] shadow-sm' 
            : 'border-[var(--soft)] text-[var(--dim)] bg-[var(--panel2)]'
        }`}>
          {isReady ? (
            <>
              Jar full. The floor sits at <b className="text-[var(--banana-hi)] font-semibold">{lb.toFixed(3)}</b>, clear of 0.60. Émile has earned the launch, and the proof replays from the stored sample.
            </>
          ) : (
            <>
              Measured <b className="text-[var(--fg)] font-medium">{auc.toFixed(3)}</b>, but ε takes <b className="text-[var(--fg)] font-medium">{e >= 1 ? 'all of it' : e.toFixed(3)}</b>. Floor is <b className="text-[var(--fg)] font-medium">{lb.toFixed(3)}</b>. 
              {model.blocked_by && (
                <span className="block text-[var(--stall)] mt-1.5 font-mono text-[10.5px]">
                  [GATE BLOCKED]: Jar capped at 95% because <b>{model.blocked_by}</b> gate failed.
                </span>
              )}
            </>
          )}
        </div>

        {/* Simulation Control Buttons */}
        <div className="btnrow flex gap-2.5 flex-wrap mt-3.5">
          <button 
            onClick={() => setSimParams({ running: !running })}
            className={`btn border text-[11px] px-3.5 py-1.75 rounded-md font-mono cursor-pointer transition-all duration-200 ${
              running 
                ? 'border-[var(--banana)] text-[var(--banana)] bg-[rgba(242,201,76,0.08)] shadow-sm' 
                : 'border-[var(--rule)] text-[var(--fg)] hover:border-[var(--banana)] hover:text-[var(--banana)] bg-transparent'
            }`}
          >
            {running ? '⏸ Pause the run' : '▶ Resume the run'}
          </button>

          <button 
            onClick={() => setSimParams({ n: n + 9200, auc: 0.645 })}
            className="btn bg-transparent border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--banana)] hover:text-[var(--banana)] text-[11px] px-3.5 py-1.75 rounded-md font-mono cursor-pointer transition-all duration-200"
          >
            ⏩ Fast-forward 30 days
          </button>

          <button 
            onClick={resetSim}
            className="btn bg-transparent border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--banana)] hover:text-[var(--banana)] text-[11px] px-3.5 py-1.75 rounded-md font-mono cursor-pointer transition-all duration-200"
          >
            🔄 Reset to day 1
          </button>
        </div>
      </div>
    </div>
  );
};
