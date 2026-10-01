'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { Hourglass } from '@/components/ui/Hourglass';
import { Tex } from '@/components/ui/Tex';
import { AgentMathSection, EquationRow, StageHeader } from '@/components/analytics/AgentMathSection';
import { EQ } from '@/config/equations';
import { useEmileStore } from '@/store/useEmileStore';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';

const CHAPTERS = [
  { n: 'I', label: 'Observe', href: '#observe' },
  { n: 'II', label: 'Learn', href: '#learn' },
  { n: 'III', label: 'Prove', href: '#prove' },
  { n: 'IV', label: 'Act', href: '#act' },
  { n: 'A', label: 'Appendix', href: '#appendix' },
  { n: '∑', label: 'Symbols', href: '#symbols' },
];

// Faint symbols drifting behind the hero.
const GLYPHS = [
  { t: String.raw`\sum`, x: '6%', y: '18%', s: '3.2rem', d: '0s' },
  { t: String.raw`\varepsilon`, x: '18%', y: '72%', s: '2.6rem', d: '1.2s' },
  { t: String.raw`\sigma(\cdot)`, x: '34%', y: '10%', s: '1.8rem', d: '2.1s' },
  { t: String.raw`\int`, x: '48%', y: '78%', s: '3.4rem', d: '0.6s' },
  { t: String.raw`\hat p`, x: '58%', y: '16%', s: '2.2rem', d: '1.8s' },
  { t: String.raw`\nabla\mathcal{L}`, x: '28%', y: '44%', s: '1.6rem', d: '2.6s' },
  { t: String.raw`\delta`, x: '8%', y: '52%', s: '2rem', d: '3s' },
];

const SYMBOLS: [string, string][] = [
  [String.raw`n,\ n_{+}`, 'Labelled tokens, and how many of them reached $30K'],
  [String.raw`\bar P_i`, 'Peak market cap of token i'],
  [String.raw`H_i`, 'Holder count, sampled once 48h after launch'],
  [String.raw`h_i`, 'Launch hour (UTC)'],
  [String.raw`\phi`, 'MiniLM sentence embedding of the lore'],
  [String.raw`d`, 'Model capacity used in the VC bound'],
  [String.raw`\delta`, 'Allowed failure probability of a bound (0.05)'],
  [String.raw`\hat p`, 'Predicted probability of survival'],
  [String.raw`\varepsilon`, 'VC capacity penalty'],
  [String.raw`\underline{\mathrm{AUC}}`, 'Proven floor: the worst-case score'],
  [String.raw`G`, 'All four gates hold'],
  [String.raw`\ell`, 'Hourglass level, from 0 to 1'],
  [String.raw`\mathcal{C}_t`, 'The 100 candidate ideas written in cycle t'],
];

export default function MathPage() {
  useEmileDatabase();
  const model = useEmileStore((s) => s.model);
  const level = Math.max(0, Math.min(100, model.jar_level * 100));

  return (
    <div className="wrap min-h-screen flex flex-col">
      <HeaderBar phaseText="the math · 18 equations" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--rule)] tex-diagonal">
        <div aria-hidden className="absolute inset-0 pointer-events-none select-none">
          {GLYPHS.map((g) => (
            <span
              key={g.t}
              className="math-glyph absolute text-[var(--banana)]"
              style={{ left: g.x, top: g.y, fontSize: g.s, animationDelay: g.d }}
            >
              <Tex>{g.t}</Tex>
            </span>
          ))}
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center px-6 md:px-12 py-14 md:py-20">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-[var(--banana)] flex items-center gap-3">
              <span className="w-8 h-px bg-[var(--banana)]" />
              Epoch Labs · The Math
            </div>
            <h1 className="font-sans font-semibold text-5xl md:text-7xl text-[var(--fg-hi)] tracking-[-0.04em] leading-[0.95] mt-5">
              Every decision,
              <br />
              <span className="text-[var(--banana)]">in one line.</span>
            </h1>
            <p className="text-[var(--dim)] text-[15px] max-w-[52ch] mt-6 leading-relaxed">
              An autonomous agent is only as honest as the equations it answers to. These are all of them: the ones that
              label the data, train the model, refuse lucky scores, and decide whether a token may launch.
            </p>

            <div className="mt-9 py-6 px-5 rounded-xl border border-[var(--border-strong)] bg-[var(--panel)] math-hero text-[var(--fg-hi)]">
              <Tex block>{EQ.master.tex}</Tex>
            </div>

            <nav className="mt-8 flex flex-wrap gap-2">
              {CHAPTERS.map((c) => (
                <a
                  key={c.href}
                  href={c.href}
                  className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--rule)] bg-[var(--panel2)] hover:border-[var(--banana)] transition-colors"
                >
                  <span className="font-serif italic text-[var(--banana)] text-sm">{c.n}</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--dim)] group-hover:text-[var(--fg-hi)]">{c.label}</span>
                </a>
              ))}
            </nav>
          </div>

          {/* The hourglass these equations drive */}
          <div className="flex flex-col items-center">
            <div className="relative w-56 h-[308px]">
              <Hourglass pct={level} className="w-full h-full" />
            </div>
            <div className="mt-4 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">Driven by equation (4.2)</div>
              <div className="font-sans font-semibold text-4xl text-[var(--banana)] tabular-nums tracking-tight mt-1">
                ℓ = {level.toFixed(1)}<span className="text-xl text-[var(--dim)]">%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core: the four stages */}
      <AgentMathSection showMasthead={false} />

      {/* Appendix: supporting equations used across the site */}
      <section id="appendix" className="theme-light tex-paper scroll-mt-24 border-t border-[var(--rule)]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-12 pt-4 pb-16">
          <StageHeader numeral="A" label="Appendix" blurb="Supporting equations behind the console, the brain, the launches and the about page." />
          {[EQ.hourRate, EQ.lift, EQ.ideaScore, EQ.brierSkill, EQ.borel].map((eq) => (
            <EquationRow key={eq.id} eq={eq} />
          ))}
        </div>
      </section>

      {/* Symbols */}
      <section id="symbols" className="scroll-mt-24 border-t border-[var(--rule)] px-6 md:px-12 py-14">
        <div className="max-w-[1180px] mx-auto">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-[var(--banana)]">Notation</div>
          <h2 className="font-sans font-semibold text-3xl text-[var(--fg-hi)] tracking-tight mt-2">Symbols used on this page</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--rule)] border border-[var(--rule)] rounded-xl overflow-hidden">
            {SYMBOLS.map(([sym, meaning]) => (
              <div key={sym} className="flex items-center gap-5 bg-[var(--panel)] px-5 py-3.5">
                <span className="w-20 shrink-0 text-[var(--banana)] text-lg">
                  <Tex>{sym}</Tex>
                </span>
                <span className="text-[var(--dim)] text-[13px]">{meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterBar />
    </div>
  );
}
