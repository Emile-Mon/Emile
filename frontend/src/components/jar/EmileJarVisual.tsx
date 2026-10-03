'use client';

import React, { useState } from 'react';
import { useEmileStore } from '@/store/useEmileStore';
import { IconPlay, IconPause, IconFastForward, IconReset } from '@/components/ui/CustomIcons';
import { Hourglass } from '@/components/ui/Hourglass';

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
  const jarPct = Math.max(0, Math.min(100, ((provenFloor - FLOOR_AUC) / (TARGET_AUC - FLOOR_AUC)) * 100));

  const isUnlocked = jarPct >= 100.0;

  // Preset to achieve full AUC 0.60 target
  const fillToTarget = () => {
    setSimParams({
      n: 9600,
      auc: 0.645,
      d: model.d,
      running: false,
    });
  };

  return (
    <div className="emile-jar-card bg-[var(--panel)] border border-[var(--rule)] rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--soft)] pb-4 mb-5 font-mono">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-[var(--faint)]">VAPNIK-CHERVONENKIS PROOF SYSTEM</div>
          <h3 className="font-sans font-semibold text-xl text-[var(--fg-hi)] mt-0.5">The Epoch Labs Capacity Hourglass</h3>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
            isUnlocked
              ? 'bg-[var(--banana)]/12 border-[var(--banana)] text-[var(--banana)]'
              : 'bg-[var(--panel2)] border-[var(--soft)] text-[var(--dim)]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-[var(--banana)] animate-ping' : 'bg-[var(--faint)]'}`} />
            {isUnlocked ? 'TARGET AUC 0.60 REACHED' : `SAND LEVEL: ${jarPct.toFixed(1)}%`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive Hourglass */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-[var(--panel2)] border border-[var(--soft)] rounded-xl relative">
          <div className="text-xs font-mono text-[var(--dim)] mb-2 uppercase tracking-wider">
            Proven Floor: <span className="text-[var(--banana)] font-bold">{provenFloor.toFixed(3)}</span> / Target: <span className="text-[var(--live)] font-bold">0.600</span>
          </div>

          {/* Hourglass Graphic: sand fallen = progress toward AUC 0.60 */}
          <div className="relative w-40 h-64">
            <Hourglass pct={jarPct} className="w-full h-full" />
          </div>
          <div className="mt-2 px-3.5 py-1.5 rounded-lg bg-[var(--panel)] border border-[var(--rule)] text-center">
            <div className="text-[9.5px] font-mono text-[var(--faint)] uppercase tracking-wider">Sand Level</div>
            <div className="text-base font-mono font-bold text-[var(--banana)]">{jarPct.toFixed(1)}%</div>
          </div>

          <div className="text-[11px] font-mono text-[var(--dim)] mt-3 text-center">
            {isUnlocked 
              ? '🎉 Full proven capacity achieved! the Epoch Labs model is statistically verified at AUC 0.60.' 
              : `Penalty ε = ${eps >= 1 ? '1.000' : eps.toFixed(3)} | Proven Floor = ${provenFloor.toFixed(3)}`}
          </div>
        </div>

        {/* Right Column: Readouts, Parameter Sliders & Test Buttons */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4 font-mono">
          {/* Key Metrics Readout Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Measured AUC</div>
              <div className="text-lg font-bold text-[var(--live)] font-sans font-semibold mt-0.5">{auc.toFixed(3)}</div>
            </div>
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Penalty ε (VC)</div>
              <div className="text-lg font-bold text-[var(--violet)] font-sans font-semibold mt-0.5">{eps >= 1 ? '-' : eps.toFixed(3)}</div>
            </div>
            <div className="p-3 bg-[var(--panel2)] border border-[var(--soft)] rounded-lg">
              <div className="text-[10px] text-[var(--faint)] uppercase">Proven Floor</div>
              <div className="text-lg font-bold text-[var(--banana)] font-sans font-semibold mt-0.5">{provenFloor.toFixed(3)}</div>
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
              <span className="text-[var(--fg)] font-bold w-14 text-right">{n.toLocaleString('en-US')}</span>
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
              className="px-4 py-2 bg-[var(--banana)] text-[var(--ink)] font-bold rounded-lg text-xs hover:bg-[var(--banana)] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <IconFastForward className="w-3.5 h-3.5" />
              <span>Fill Hourglass to Target AUC 0.60</span>
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
