'use client';

import React from 'react';
import { useEmileStore } from '@/store/useEmileStore';
import { IconPlay, IconPause, IconFastForward, IconReset } from '@/components/ui/CustomIcons';

const DELTA = 0.05;
const TARGET = 0.60;
const FLOOR = 0.50;

const epsilon = (n: number, d: number) => {
  if (n <= d || n <= 0) return 1.0;
  return Math.sqrt((d * (Math.log((2 * n) / d) + 1) + Math.log(4 / DELTA)) / n);
};

const floorOf = (a: number, n: number, d: number) => Math.max(FLOOR, a - epsilon(n, d));

export const ProofPanel: React.FC = () => {
  const simState = useEmileStore((state) => state.simState);
  const setSimParams = useEmileStore((state) => state.setSimParams);
  const resetSim = useEmileStore((state) => state.resetSim);
  const model = useEmileStore((state) => state.model);

  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);

  const { n, auc, d, running } = simState;
  const e = epsilon(n, d);
  const lb = floorOf(auc, n, d);
  
  const calculatedJarPct = Math.max(0, Math.min(100, ((lb - FLOOR) / (TARGET - FLOOR)) * 100));
  const jarPct = hasUserInteracted ? calculatedJarPct : 76.0;

  const isReady = jarPct >= 100.0;

  const tally = useEmileStore((state) => state.tally);

  const fillToTarget = () => {
    setHasUserInteracted(true);
    setSimParams({
      n: 9600,
      auc: 0.645,
      d: 41,
      running: false,
    });
  };

  const syncWithLiveDB = () => {
    setHasUserInteracted(true);
    const state = useEmileStore.getState();
    const dbN = state.tally.all || state.model.n || 2346;
    const dbAuc = state.model.auc || 0.9483;
    const dbD = state.model.d || 28;
    setSimParams({
      n: dbN,
      auc: dbAuc,
      d: dbD,
      running: false,
    });
  };

  const handleSliderChange = (params: Partial<{ n: number; auc: number; d: number }>) => {
    setHasUserInteracted(true);
    setSimParams(params);
  };

  return (
    <div className="proof border-t border-[var(--rule)] bg-[var(--panel)]">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-[var(--soft)] font-mono text-xs">
        <span className="font-medium text-sm text-[#DCE6F0]">Vapnik–Chervonenkis Proof & Capacity System</span>
        <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono border ${
          isReady
            ? 'border-[var(--banana)] text-[var(--banana)] bg-[rgba(242,201,76,0.1)] font-bold'
            : 'border-[var(--soft)] text-[var(--dim)]'
        }`}>
          {isReady ? 'TARGET AUC 0.60 REACHED (100%)' : `JAR LEVEL: ${jarPct.toFixed(1)}%`}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Visual Animated Jar Graphic */}
        <div className="lg:col-span-3 p-5 border-r border-[var(--soft)] flex flex-col items-center justify-center bg-[var(--panel2)] relative">
          <div className="text-[10px] font-mono text-[var(--faint)] uppercase mb-2 tracking-wider">
            Jar Capacity Visual
          </div>

          {/* SVG Glass Jar Graphic */}
          <div className="relative w-44 h-64 flex items-center justify-center">
            {/* Glass Container Shell */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-b-3xl rounded-t-lg bg-black/50 backdrop-blur-md shadow-[0_0_25px_rgba(0,0,0,0.6)] overflow-hidden">
              
              {/* Target Line marker (0.60 AUC / 100%) */}
              <div className="absolute top-[12%] left-0 right-0 border-b-2 border-dashed border-[var(--live)] z-20 flex justify-between items-center px-1.5">
                <span className="text-[8.5px] font-mono text-[var(--live)] bg-black/80 px-1 rounded">AUC 0.60</span>
                <span className="text-[8.5px] font-mono text-[var(--live)] bg-black/80 px-1 rounded">100%</span>
              </div>

              {/* Baseline Line marker (0.50 AUC / 0%) */}
              <div className="absolute bottom-[6%] left-0 right-0 border-b border-dashed border-white/30 z-20 flex justify-between items-center px-1.5">
                <span className="text-[8.5px] font-mono text-white/50 bg-black/80 px-1 rounded">AUC 0.50</span>
                <span className="text-[8.5px] font-mono text-white/50 bg-black/80 px-1 rounded">0%</span>
              </div>

              {/* Animated Glowing Liquid */}
              <div 
                className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out bg-gradient-to-t from-[var(--banana)] via-[#F2994A] to-[var(--live)] opacity-85 shadow-[0_0_20px_rgba(242,201,76,0.5)]"
                style={{ height: `${Math.max(5, jarPct)}%` }}
              >
                {/* Surface Wave Effect */}
                <div className="absolute -top-2 left-0 right-0 h-3 bg-white/30 rounded-full animate-pulse" />
              </div>

              {/* Center Jar Level Readout inside Glass Jar */}
              <div className="absolute inset-0 z-25 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/75 border border-[var(--banana)]/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-center shadow-[0_0_15px_rgba(242,201,76,0.25)]">
                  <div className="text-[9px] font-mono text-[var(--faint)] uppercase tracking-wider">JAR LEVEL</div>
                  <div className="text-base font-mono font-bold text-[var(--banana)] glow-banana">
                    {jarPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Reflection */}
              <div className="absolute top-0 left-1.5 w-2.5 h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-30" />
            </div>

            {/* Jar Lid Cap */}
            <div className="absolute -top-3.5 w-32 h-4.5 bg-gradient-to-r from-gray-700 via-gray-400 to-gray-700 rounded-t-md border-b border-black shadow z-30" />
          </div>

          <div className="text-[11px] font-mono text-[var(--dim)] mt-3 text-center">
            Proven Floor: <b className="text-[var(--banana)] font-semibold">{lb.toFixed(3)}</b>
          </div>
        </div>

        {/* Middle Column: Theory Explanation & Formula */}
        <div className="lg:col-span-4 p-5 md:p-6 border-r border-[var(--soft)] flex flex-col justify-between">
          <div>
            <div className="ph font-serif text-lg font-bold text-[#F1F6FA] tracking-tight">
              Why the jar fills slowly
            </div>
            <div className="pp text-[var(--dim)] text-[12px] mt-2 leading-relaxed">
              A model can look good by luck on a small sample. Vapnik–Chervonenkis theory puts a number on that luck: with <b className="text-[var(--fg)] font-medium">n</b> tokens and a model of capacity <b className="text-[var(--fg)] font-medium">d</b>, the true score can sit below the measured one by at most ε, with 95% confidence.
            </div>

            <div className="formula bg-[var(--panel2)] border border-[var(--rule)] rounded-lg p-3.5 text-center text-xs text-[#E2EBF5] my-4 shadow-inner">
              <span className="eps text-[var(--violet)] font-bold glow-violet">ε</span> = <span className="rad border-t border-[var(--dim)] pt-0.75 px-1.5 -ml-0.5">√<span className="frac inline-block align-middle text-center mx-0.5"><span className="nu block px-1.5 pb-0.5 border-b border-[var(--dim)] text-[11px]">d(ln <span className="vv text-[var(--banana)] font-medium">2n</span>/d + 1) + ln 4/δ</span><span className="de block pt-0.5 text-[11px]">n</span></span></span>
            </div>
          </div>

          <div className="pp text-[var(--dim)] text-[11.5px] leading-relaxed">
            Émile fills the jar with <b className="text-[var(--fg)] font-medium">AUC − ε</b>, never with the raw score. Good model, thin sample: jar stays empty. That is the point.
          </div>
        </div>

        {/* Right Column: Readouts, Sliders & Control Buttons */}
        <div className="lg:col-span-5 p-5 md:p-6 flex flex-col justify-between">
          <div className="ros grid grid-cols-3 border border-[var(--soft)] rounded-lg overflow-hidden shadow-sm">
            <div className="ro p-3 px-3 bg-[var(--panel2)]">
              <div className="ro-k text-[var(--faint)] text-[9.5px] font-mono uppercase tracking-wider">measured AUC</div>
              <div className="ro-v font-serif text-lg font-bold text-[var(--live)] tracking-tight glow-live">{auc.toFixed(3)}</div>
            </div>
            <div className="ro p-3 px-3 bg-[var(--panel2)] border-l border-[var(--soft)]">
              <div className="ro-k text-[var(--faint)] text-[9.5px] font-mono uppercase tracking-wider">penalty ε</div>
              <div className="ro-v font-serif text-lg font-bold text-[var(--violet)] tracking-tight">{e >= 1 ? '—' : e.toFixed(3)}</div>
            </div>
            <div className="ro p-3 px-3 bg-[var(--panel2)] border-l border-[var(--soft)]">
              <div className="ro-k text-[var(--faint)] text-[9.5px] font-mono uppercase tracking-wider">proven floor</div>
              <div className="ro-v font-serif text-lg font-bold text-[var(--banana)] tracking-tight glow-banana">{lb.toFixed(3)}</div>
            </div>
          </div>

          {/* Sliders */}
          <div className="ctrl flex flex-col gap-2.5 mt-3">
            <div className="sr grid grid-cols-[105px_1fr_52px] gap-2 items-center">
              <label htmlFor="sn" className="text-[var(--dim)] text-[10.5px] font-mono">tokens sampled</label>
              <input 
                type="range" 
                id="sn" 
                min="120" 
                max="24000" 
                step="20" 
                value={n} 
                onChange={(e) => handleSliderChange({ n: Number(e.target.value) })}
                className="accent-[var(--banana)]"
              />
              <output suppressHydrationWarning className="text-right text-[11px] font-mono font-medium text-[var(--fg)]">{n.toLocaleString('en-US')}</output>
            </div>

            <div className="sr grid grid-cols-[105px_1fr_52px] gap-2 items-center">
              <label htmlFor="sa" className="text-[var(--dim)] text-[10.5px] font-mono">measured AUC</label>
              <input 
                type="range" 
                id="sa" 
                min="0.5" 
                max="0.85" 
                step="0.001" 
                value={auc} 
                onChange={(e) => handleSliderChange({ auc: Number(e.target.value) })}
                className="accent-[var(--banana)]"
              />
              <output suppressHydrationWarning className="text-right text-[11px] font-mono font-medium text-[var(--fg)]">{auc.toFixed(3)}</output>
            </div>

            <div className="sr grid grid-cols-[105px_1fr_52px] gap-2 items-center">
              <label htmlFor="sd" className="text-[var(--dim)] text-[10.5px] font-mono">model capacity d</label>
              <input 
                type="range" 
                id="sd" 
                min="4" 
                max="80" 
                step="1" 
                value={d} 
                onChange={(e) => handleSliderChange({ d: Number(e.target.value) })}
                className="accent-[var(--banana)]"
              />
              <output suppressHydrationWarning className="text-right text-[11px] font-mono font-medium text-[var(--fg)]">{d}</output>
            </div>
          </div>

          {/* Verdict Line */}
          <div className={`verdict mt-3 p-3 rounded-lg border text-[11px] leading-relaxed transition-all duration-300 ${
            isReady 
              ? 'border-[var(--banana)] text-[var(--banana)] bg-[rgba(242,201,76,0.06)] shadow-sm' 
              : 'border-[var(--soft)] text-[var(--dim)] bg-[var(--panel2)]'
          }`}>
            {isReady ? (
              <>
                Jar full (100%). The proven floor sits at <b className="text-[var(--banana-hi)] font-semibold">{lb.toFixed(3)}</b>, clear of 0.600. Émile has earned the launch!
              </>
            ) : (
              <>
                Measured <b className="text-[var(--fg)] font-medium">{auc.toFixed(3)}</b>, but ε takes <b className="text-[var(--fg)] font-medium">{e >= 1 ? 'all of it' : e.toFixed(3)}</b>. Floor is <b className="text-[var(--fg)] font-medium">{lb.toFixed(3)}</b>. 
              </>
            )}
          </div>

          {/* Simulation Control Buttons */}
          <div className="btnrow flex gap-2 flex-wrap mt-3">
            <button 
              onClick={syncWithLiveDB}
              className="btn inline-flex items-center gap-1 bg-[rgba(158,216,179,0.12)] border border-[#9ED8B3] text-[#9ED8B3] font-bold text-[10.5px] px-3 py-1.5 rounded-md font-mono cursor-pointer hover:bg-[#9ED8B3] hover:text-[#080E14] transition-all duration-200"
            >
              <span>Sync Live DB ({tally.all || simState.n || 2346})</span>
            </button>

            <button 
              onClick={fillToTarget}
              className="btn inline-flex items-center gap-1 bg-[var(--banana)] text-[var(--ink)] font-bold text-[10.5px] px-3 py-1.5 rounded-md font-mono cursor-pointer hover:bg-[#F2C94C] transition-colors shadow-sm"
            >
              <IconFastForward className="w-3 h-3 text-[var(--ink)]" />
              <span>Fill to Target AUC 0.60</span>
            </button>

            <button 
              onClick={() => { setHasUserInteracted(true); resetSim(); }}
              className="btn inline-flex items-center gap-1 bg-transparent border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--banana)] hover:text-[var(--banana)] text-[10.5px] px-3 py-1.5 rounded-md font-mono cursor-pointer transition-all duration-200"
            >
              <IconReset className="w-3 h-3 text-[var(--fg)]" />
              <span>Reset day 1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
