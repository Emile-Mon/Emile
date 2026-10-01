'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { IconWarning, IconDownload, IconFileCode } from '@/components/ui/CustomIcons';
import { FormulaStrip } from '@/components/math/FormulaStrip';
import { EQ } from '@/config/equations';

export default function AboutEpochLabsPage() {
  return (
    <div className="wrap min-h-screen flex flex-col">
      <HeaderBar phaseText="about · methodology & transparency" />

      <main className="w-full p-6 md:p-10 space-y-8 flex-1">
        {/* SECTION 5: Mandatory Disclaimer (Above the fold on mobile as requested by brief §10.5) */}
        <section className="p-5 border border-[var(--banana-lo)] bg-[var(--panel2)] rounded text-[var(--banana-hi)] leading-relaxed">
          <h2 className="font-sans font-semibold text-lg text-[var(--banana)] mb-2 flex items-center gap-2">
            <IconWarning className="w-5 h-5 text-[var(--banana)]" />
            <span>What Epoch Labs Is Not</span>
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs font-mono text-[var(--fg)]">
            <li>Epoch Labs <b className="text-[var(--banana)]">does not predict price</b>. It estimates the probability that a token which already reached $10K will reach $30K.</li>
            <li>Epoch Labs <b className="text-[var(--banana)]">does not have an edge that guarantees returns</b>. Four features cannot forecast a market.</li>
            <li>The hourglass <b className="text-[var(--banana)]">is not decorative</b>. If the model is bad, the hourglass never runs and the site says so.</li>
          </ul>
        </section>

        {/* SECTION 1: Borel's Monkeys */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            1. Borel's Infinite Monkeys
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            Epoch Labs takes its idea from <b>Émile Borel</b> (1871–1956), the French mathematician who formulated the infinite monkey theorem: a monkey hitting keys at random for long enough will, <i>almost surely</i>, type the works of Shakespeare. "Almost surely" is Borel's technical term — an event of probability 1.
          </p>
        </section>

        {/* SECTION 2: Why It Fits */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            2. Why it fits Robinhood Chain
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            Robinhood Chain is the room full of typewriters. Thousands of people throwing random token names at the DEX pools every day, and once in a while something sticks. Epoch Labs is the one monkey that decided to sit down and write the results in a notebook.
          </p>
        </section>

        {/* SECTION 3: What Epoch Labs Actually Does */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            3. What Epoch Labs Actually Does
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            Every token launched on Robinhood Chain DEX pools that reaches <b>$10,000 peak market cap</b> enters the study population. Epoch Labs observes whether it goes on to reach <b>$30,000 peak market cap</b>, using four feature families (launch hour sin/cos, day of week, 48h holder count, and lore text embeddings).
          </p>
        </section>

        {/* SECTION 4: The Hourglass & Capacity Math */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            4. Why the Hourglass Runs Slowly
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            A model can look good by luck on a small sample. Vapnik–Chervonenkis theory and bootstrap resamples compute a proven performance floor (<code className="text-[var(--banana)]">proven_floor = min(floor_vc, floor_boot)</code>). The sand level is driven by this floor, not raw score. We explicitly admit that capacity parameter <i>d</i> (28) is a chosen capacity parameter, not a derived VC dimension.
          </p>
        </section>

        {/* SECTION 6: Check His Work & Open Data */}
        <section className="space-y-3 p-5 border border-[var(--rule)] bg-[var(--panel)] rounded">
          <h2 className="font-sans font-semibold text-xl text-[var(--fg-hi)] mb-2">
            6. Check His Work (Open Data)
          </h2>
          <p className="text-[var(--dim)] text-xs mb-3">
            Anyone can verify the model, reproduce the AUC score, and check whether the hourglass is honest.
          </p>
          <div className="flex gap-4 font-mono text-xs flex-wrap">
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/dataset.csv`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--panel2)] border border-[var(--banana)] text-[var(--banana)] rounded hover:bg-[var(--banana)] hover:text-[var(--ink)] transition-colors group"
            >
              <IconDownload className="w-4 h-4 text-[var(--banana)] group-hover:text-[var(--ink)] transition-colors" />
              <span>Download dataset.csv</span>
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/methodology.json`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--panel2)] border border-[var(--rule)] text-[var(--fg)] rounded hover:border-[var(--banana)] transition-colors"
            >
              <IconFileCode className="w-4 h-4 text-[var(--fg)]" />
              <span>View methodology.json</span>
            </a>
          </div>
        </section>
      </main>

      <FormulaStrip title="From infinite monkeys to a proven floor" eqs={[EQ.borel, EQ.vc, EQ.floor]} />

      <FooterBar />
    </div>
  );
}
