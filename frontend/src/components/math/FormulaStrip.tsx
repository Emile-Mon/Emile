import React from 'react';
import Link from 'next/link';
import { Tex } from '@/components/ui/Tex';
import { Equation } from '@/config/equations';

interface FormulaStripProps {
  title: string;
  eqs: Equation[];
  className?: string;
}

/** A compact amber band showing the equations behind the page it sits on, linking to /math. */
export const FormulaStrip: React.FC<FormulaStripProps> = ({ title, eqs, className = '' }) => (
  <section className={`theme-light tex-paper border-t border-[var(--rule)] ${className}`}>
    <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--banana)]">The math on this page</div>
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)] tracking-tight mt-1.5">{title}</h2>
        </div>
        <Link
          href="/math"
          className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--fg-hi)] border-b border-[var(--fg-hi)]/40 hover:border-[var(--fg-hi)] pb-0.5"
        >
          All equations
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      <div className={`grid grid-cols-1 grid-flow-dense gap-3 ${eqs.length === 3 && !eqs.some((e) => e.wide) ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
        {eqs.map((eq) => (
          <article key={eq.id} className={`rounded-lg border border-[var(--rule)] bg-[var(--panel)] p-5 flex flex-col ${eq.wide ? 'md:col-span-2' : ''}`}>
            <header className="flex items-baseline justify-between">
              <span className="font-sans font-semibold text-[14px] text-[var(--fg-hi)]">{eq.title}</span>
              <span className="font-serif italic text-[13px] text-[var(--faint)]">({eq.id})</span>
            </header>
            <div className="math-formula math-strip overflow-x-auto text-[var(--fg-hi)] my-4 text-center">
              <Tex block>{eq.tex}</Tex>
            </div>
            <p className="text-[var(--dim)] text-[12px] leading-relaxed mt-auto">{eq.note}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
