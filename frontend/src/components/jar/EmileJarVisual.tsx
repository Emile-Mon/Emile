'use client';

import React, { useState } from 'react';
import { useEmileStore } from '@/store/useEmileStore';
import { IconPlay, IconPause, IconFastForward, IconReset } from '@/components/ui/CustomIcons';

const DELTA = 0.05;
const TARGET_AUC = 0.60;
const FLOOR_AUC = 0.50;

// Vapnik-Chervonenkis Penalty Calculation
const calcEpsilon = (n: number, d: number) => {
  if (n <= d || n <= 0) return 1.0;
  const term1 = d * (Math.log((2.0 * n) / d) + 1.0);
  const term2 = Math.log(4.0 / DELTA);
  const val = (term1 + term2) / n;
  return val > 0 ? Math.sqrt(val) : 0.0;
};

export const EmileJarVisual: React.FC = () => {
  const simState = useEmileStore((state) => state.simState);
  const setSimParams = useEmileStore((state) => state.setSimParams);
  const resetSim = useEmileStore((state) => state.resetSim);
  const model = useEmileStore((state) => state.model);

  const { n, auc, d, running } = simState;
  const eps = calcEpsilon(n, d);
  const provenFloor = Math.max(FLOOR_AUC, auc - eps);
  const jarPct = Math.max(0, Math.min(100, ((auc - FLOOR_AUC) / (TARGET_AUC - FLOOR_AUC)) * 100));

  const isUnlocked = jarPct >= 100.0;

  // Preset to achieve full AUC 0.60 target
  const fillToTarget = () => {
    setSimParams({
      n: 9600,
      auc: 0.645,
      d: 28,
      running: false,
    });
  };

  return (
    <div className="emile-jar-card bg-[var(--panel)] border border-[var(--rule)] rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--soft)] pb-4 mb-5 font-mono">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-[var(--faint)]">VAPNIK-CHERVONENKIS PROOF SYSTEM</div>
          <h3 className="font-serif font-bold text-xl text-[#F0F5FA] mt-0.5">The Émile Capacity Jar</h3>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
            isUnlocked
              ? 'bg-[rgba(242,201,76,0.12)] border-[var(--banana)] text-[var(--banana)]'
              : 'bg-[var(--panel2)] border-[var(--soft)] text-[var(--dim)]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-[var(--banana)] animate-ping' : 'bg-[var(--faint)]'}`} />
            {isUnlocked ? 'TARGET AUC 0.60 REACHED' : `JAR LEVEL: ${jarPct.toFixed(1)}%`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive Visual Glass Jar */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-[var(--panel2)] border border-[var(--soft)] rounded-xl relative">
          <div className="text-xs font-mono text-[var(--dim)] mb-2 uppercase tracking-wider">
            Proven Floor: <span className="text-[var(--banana)] font-bold">{provenFloor.toFixed(3)}</span> / Target: <span className="text-[var(--live)] font-bold">0.600</span>
          </div>

          {/* SVG Glass Jar Graphic */}
          <div className="relative w-48 h-72 flex items-center justify-center">
            {/* Glass Container Outer Shell */}
            <div className="absolute inset-0 border-4 border-white/20 rounded-b-3xl rounded-t-lg bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden">
              
              {/* Target Line marker (0.60 AUC / 100%) */}
              <div className="absolute top-[10%] left-0 right-0 border-b-2 border-dashed border-[var(--live)] z-20 flex justify-between items-center px-2">
                <span className="text-[9px] font-mono text-[var(--live)] bg-black/80 px-1 rounded">AUC 0.60 (TARGET)</span>
                <span className="text-[9px] font-mono text-[var(--live)] bg-black/80 px-1 rounded">100%</span>
              </div>

              {/* Baseline Line marker (0.50 AUC / 0%) */}
              <div className="absolute bottom-[5%] left-0 right-0 border-b border-dashed border-white/30 z-20 flex justify-between items-center px-2">
                <span className="text-[9px] font-mono text-white/50 bg-black/80 px-1 rounded">AUC 0.50 (FLOOR)</span>
                <span className="text-[9px] font-mono text-white/50 bg-black/80 px-1 rounded">0%</span>
              </div>

              {/* Animated Glowing Liquid */}
              <div 
                className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out bg-gradient-to-t from-[var(--banana)] via-[#F2994A] to-[var(--live)] opacity-85 shadow-[0_0_25px_rgba(242,201,76,0.6)]"
                style={{ height: `${Math.max(5, jarPct)}%` }}
              >
                {/* Surface Wave Animation */}
                <div className="absolute -top-3 left-0 right-0 h-4 bg-white/30 rounded-full animate-pulse" />
              </div>

              {/* Center Jar Level Readout inside Glass Jar */}
              <div className="absolute inset-0 z-25 flex flex-col items-center justify-center pointer-events-none">
                <div className="bg-black/75 border border-[var(--banana)]/40 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-center shadow-[0_0_15px_rgba(242,201,76,0.25)]">
                  <div className="text-[9.5px] font-mono text-[var(--faint)] uppercase tracking-wider">JAR LEVEL</div>
                  <div className="text-base font-mono font-bold text-[var(--banana)] glow-banana">
                    {jarPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Glass Reflection Highlight */}
              <div className="absolute top-0 left-2 w-3 h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none z-30" />
            </div>

            {/* Jar Lid Cap */}
            <div className="absolute -top-4 w-36 h-5 bg-gradient-to-r from-gray-700 via-gray-400 to-gray-700 rounded-t-md border-b-2 border-black shadow-md z-30" />
          </div>

          <div className="text-[11px] font-mono text-[var(--dim)] mt-3 text-center">
            {isUnlocked 
              ? '🎉 Full proven capacity achieved! Émile model is statistically verified at AUC 0.60.' 
              : `Penalty ε = ${eps >= 1 ? '1.000' : eps.toFixed(3)} | Proven Floor = ${provenFloor.toFixed(3)}`}
          </div>
        </div>

        {/* Right Column: Readouts, Parameter Sliders & Test Buttons */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4 font-mono">
          {/* Key Metrics Readout Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Measured AUC</div>
              <div className="text-lg font-bold text-[var(--live)] font-serif mt-0.5">{auc.toFixed(3)}</div>
            </div>
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Penalty ε (VC)</div>
              <div className="text-lg font-bold text-[var(--violet)] font-serif mt-0.5">{eps >= 1 ? '—' : eps.toFixed(3)}</div>
            </div>
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Proven Floor</div>
              <div className="text-lg font-bold text-[var(--banana)] font-serif mt-0.5">{provenFloor.toFixed(3)}</div>
            </div>
          </div>

          {/* Interactive Controls */}
          <div className="space-y-3 p-4 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="jar-n" className="text-[var(--dim)]">Tokens Sampled (n):</label>
              <input 
                id="jar-n" 
                type="range" 
                min="120" 
                max="24000" 
                step="50" 
                value={n} 
                onChange={(e) => setSimParams({ n: Number(e.target.value) })}
                className="w-1/2 accent-[var(--banana)]"
              />
              <span className="text-[var(--fg)] font-bold w-14 text-right">{n.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="jar-auc" className="text-[var(--dim)]">Measured AUC:</label>
              <input 
                id="jar-auc" 
                type="range" 
                min="0.500" 
                max="0.850" 
                step="0.005" 
                value={auc} 
                onChange={(e) => setSimParams({ auc: Number(e.target.value) })}
                className="w-1/2 accent-[var(--banana)]"
              />
              <span className="text-[var(--fg)] font-bold w-14 text-right">{auc.toFixed(3)}</span>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="jar-d" className="text-[var(--dim)]">Model Capacity (d):</label>
              <input 
                id="jar-d" 
                type="range" 
                min="4" 
                max="80" 
                step="1" 
                value={d} 
                onChange={(e) => setSimParams({ d: Number(e.target.value) })}
                className="w-1/2 accent-[var(--banana)]"
              />
              <span className="text-[var(--fg)] font-bold w-14 text-right">{d}</span>
            </div>
          </div>

          {/* Preset Buttons for Quick Testing */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={fillToTarget}
              className="px-4 py-2 bg-[var(--banana)] text-[var(--ink)] font-bold rounded-lg text-xs hover:bg-[#F2C94C] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <IconFastForward className="w-3.5 h-3.5" />
              <span>Fill Jar to Target AUC 0.60</span>
            </button>

            <button
              onClick={resetSim}
              className="px-3.5 py-2 bg-[var(--panel2)] border border-[var(--rule)] text-[var(--fg)] hover:border-[var(--banana)] rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <IconReset className="w-3.5 h-3.5" />
              <span>Reset to Initial State</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
