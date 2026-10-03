'use client';

import React from 'react';
import { Tex } from '@/components/ui/Tex';
import { useEmileStore } from '@/store/useEmileStore';
import { EQ, Equation } from '@/config/equations';

interface Stage {
  key: string;
  label: string;
  blurb: string;
  eqs: (Equation & { live?: React.ReactNode })[];
}

export const Live: React.FC<{ label: string; value: string; tone?: 'ok' | 'bad' | 'accent' }> = ({ label, value, tone = 'accent' }) => {
  const color = tone === 'ok' ? 'text-[var(--live)]' : tone === 'bad' ? 'text-[var(--stall)]' : 'text-[var(--banana)]';
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-[10.5px]">
      <span className="text-[var(--faint)]">{label}</span>
      <b className={`${color} font-medium tabular-nums`}>{value}</b>
    </span>
  );
};

const LiveRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-2.5 border-t border-dashed border-[var(--rule)]">
    <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--faint)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--live)] lamp-active" />
      live
    </span>
    {children}
  </div>
);

/** One textbook-style row: title + note on the left, typeset equation in the middle, number on the right. */
export const EquationRow: React.FC<{ eq: Equation; live?: React.ReactNode }> = ({ eq, live }) => (
  <div className="math-row grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3.5rem] gap-x-8 gap-y-3 items-center py-6 border-b border-[var(--rule)] last:border-b-0">
    <div>
      <div className="font-sans font-semibold text-[15px] text-[var(--fg-hi)]">{eq.title}</div>
      <p className="text-[var(--dim)] text-[12.5px] leading-relaxed mt-1">{eq.note}</p>
      {eq.source && (
        <div className="font-mono text-[10px] text-[var(--faint)] mt-1.5">backend/app/{eq.source}</div>
      )}
      {live && <LiveRow>{live}</LiveRow>}
    </div>
    <div className="math-formula overflow-x-auto text-[var(--fg-hi)] md:text-center">
      <Tex block>{eq.tex}</Tex>
    </div>
    <div className="hidden md:block text-right font-serif italic text-[15px] text-[var(--faint)]">({eq.id})</div>
  </div>
);

export const StageHeader: React.FC<{ numeral: string; label: string; blurb: string }> = ({ numeral, label, blurb }) => (
  <div className="flex items-end gap-4 pb-4 border-b border-[var(--border-strong)]">
    <span className="font-serif italic text-5xl leading-none text-[var(--banana)]/80 w-16">{numeral}</span>
    <div>
      <div className="font-sans font-semibold text-2xl text-[var(--fg-hi)] tracking-tight leading-none">{label}</div>
      <div className="text-[var(--dim)] text-[13px] mt-1.5">{blurb}</div>
    </div>
  </div>
);

export const AgentMathSection: React.FC<{ showMasthead?: boolean }> = ({ showMasthead = true }) => {
  const model = useEmileStore((s) => s.model);
  const gates = model.gates || {};
  const allGates = Object.values(gates).length > 0 && Object.values(gates).every(Boolean);
  // ε as stored with the model run (same formula, delta and d as the backend), never recomputed here
  const eps = model.epsilon_vc;


  const stages: Stage[] = [
    {
      key: 'I',
      label: 'Observe',
      blurb: 'Every token that clears $10K becomes one labelled example.',
      eqs: [
        { ...EQ.label, live: <Live label="survivors" value={`${model.n_positive.toLocaleString('en-US')} of ${model.n.toLocaleString('en-US')}`} /> },
        { ...EQ.features, live: <Live label="d =" value={`${model.d}`} /> },
      ],
    },
    {
      key: 'II',
      label: 'Learn',
      blurb: 'Boosted trees turn features into a probability of survival.',
      eqs: [
        EQ.model,
        EQ.loss,
        { ...EQ.auc, live: <Live label="5-fold" value={`${model.auc.toFixed(3)} ± ${model.auc_std.toFixed(3)}`} /> },
      ],
    },
    {
      key: 'III',
      label: 'Prove',
      blurb: 'A score counts only after surviving two independent worst cases.',
      eqs: [
        { ...EQ.vc, live: <Live label={`n = ${model.n}, d = ${model.d}  →  ε =`} value={eps.toFixed(4)} /> },
        { ...EQ.boot, live: <Live label="bound =" value={model.auc_boot_lower.toFixed(4)} /> },
        { ...EQ.floor, live: <Live label="floor =" value={model.proven_floor.toFixed(4)} /> },
      ],
    },
    {
      key: 'IV',
      label: 'Act',
      blurb: 'The agent may launch only when the mathematics allows it.',
      eqs: [
        {
          ...EQ.gates,
          live: (
            <>
              {Object.entries(gates).map(([k, v], i) => (
                <Live key={k} label={`g${i + 1}`} value={v ? 'pass' : 'fail'} tone={v ? 'ok' : 'bad'} />
              ))}
            </>
          ),
        },
        { ...EQ.level, live: <Live label="ℓ =" value={`${(model.jar_level * 100).toFixed(1)}%`} tone={allGates ? 'ok' : 'accent'} /> },
        EQ.choice,
        EQ.commit,
        EQ.brier,
      ],
    },
  ];

  const count = stages.reduce((a, s) => a + s.eqs.length, 0);

  return (
    <section id="core" className="theme-light tex-paper relative border-t border-[var(--rule)] overflow-hidden">
      <div className="relative max-w-[1180px] mx-auto px-6 md:px-12 pt-14 pb-16">
        {showMasthead && (
          <div className="text-center">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[var(--banana)]">
              The mathematics · {count} equations
            </div>
            <h2 className="font-sans font-semibold text-3xl md:text-[2.6rem] leading-[1.1] text-[var(--fg-hi)] tracking-tight mt-3">
              How an autonomous agent decides.
            </h2>
            <p className="text-[var(--dim)] text-[14px] max-w-[58ch] mx-auto mt-3 leading-relaxed">
              No human picks the launch. Epoch Labs observes, learns, proves and acts in a closed loop, and every step reduces to a single line you can check.
            </p>

            <div className="math-hero relative mt-9 mx-auto max-w-[760px] py-7 px-6 border-y border-[var(--border-strong)] text-[var(--fg-hi)]">
              <Tex block>{EQ.master.tex}</Tex>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--faint)] mt-3">{EQ.master.note}</div>
            </div>
          </div>
        )}

        <div className={`${showMasthead ? 'mt-14' : ''} space-y-14`}>
          {stages.map((stage) => (
            <div key={stage.key} id={stage.label.toLowerCase()} className="scroll-mt-24">
              <StageHeader numeral={stage.key} label={stage.label} blurb={stage.blurb} />
              <div>
                {stage.eqs.map(({ live, ...eq }) => (
                  <EquationRow key={eq.id} eq={eq} live={live} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
