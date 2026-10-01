'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { IconWarning, IconDownload, IconFileCode } from '@/components/ui/CustomIcons';
import { FormulaStrip } from '@/components/math/FormulaStrip';
import { EQ } from '@/config/equations';
import { getApiBaseUrl } from '@/config/constants';

export default function AboutEpochLabsPage() {
  return (
    <div className="wrap min-h-screen flex flex-col">
      <HeaderBar phaseText="about · quantitative research & methodology" />

      <main className="w-full p-6 md:p-10 space-y-8 flex-1">
        {/* MANDATORY DISCLAIMER */}
        <section className="p-5 border border-[var(--banana-lo)] bg-[var(--panel2)] rounded text-[var(--banana-hi)] leading-relaxed">
          <h2 className="font-sans font-semibold text-lg text-[var(--banana)] mb-2 flex items-center gap-2">
            <IconWarning className="w-5 h-5 text-[var(--banana)]" />
            <span>What Epoch Labs Is Not</span>
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs font-mono text-[var(--fg)]">
            <li>Epoch Labs <b className="text-[var(--banana)]">does not predict price</b>. It estimates the conditional probability that a token which already reached $10K peak market cap will go on to reach $30K.</li>
            <li>Epoch Labs <b className="text-[var(--banana)]">does not have an edge that guarantees financial returns</b>. Four feature families cannot forecast an entire market.</li>
            <li>The hourglass <b className="text-[var(--banana)]">is not decorative</b>. If the model does not statistically beat random noise under strict capacity bounds, the hourglass stays empty and the system explicitly reports the failing gate.</li>
          </ul>
        </section>

        {/* SECTION 1: The Philosophy of Epochs */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            1. The Concept of Epochs
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            In machine learning and computational mathematics, an <b>epoch</b> defines a complete cycle through an evolving universe of data. Epoch Labs was founded on the principle that decentralized markets produce continuous streams of behavioral data, but are rarely analyzed with empirical rigor. Rather than relying on intuition or speculative narratives, Epoch Labs evaluates token lifecycles systematically across every market cycle.
          </p>
        </section>

        {/* SECTION 2: Why Robinhood Chain */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            2. Why Robinhood Chain
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            Robinhood Chain operates with continuous liquidity creation and rapid token velocity. Hundreds of micro-assets are minted and traded around the clock, creating a rich distribution of market experiments. While the vast majority stall quickly, a small fraction achieve sustained liquidity. Epoch Labs acts as an autonomous observer, recording every launch, tracking peak market capitalizations, and discovering empirical patterns behind token survival.
          </p>
        </section>

        {/* SECTION 3: What Epoch Labs Actually Does */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            3. What Epoch Labs Actually Does
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            Every token launched on Robinhood Chain that crosses <b>$10,000 peak market cap</b> enters the study population. Epoch Labs observes whether it successfully progresses to <b>$30,000 peak market cap</b> over a 48-hour observation window. Using four orthogonal feature families (launch hour circular encoding, day of the week, 48h holder distribution, and NLP lore semantic embeddings), an ensemble of gradient-boosted decision trees (LightGBM) estimates the survival probability.
          </p>
        </section>

        {/* SECTION 4: The Hourglass & Capacity Math */}
        <section className="space-y-3">
          <h2 className="font-sans font-semibold text-2xl text-[var(--fg-hi)]">
            4. Why the Hourglass Runs Slowly
          </h2>
          <p className="text-[var(--dim)] text-sm leading-relaxed">
            In small sample regimes, an ML model can appear artificially predictive purely due to variance and overfitting. To counter this, Epoch Labs enforces a mathematically proven performance floor (<code className="text-[var(--banana)]">proven_floor = min(floor_vc, floor_boot)</code>) combining <b>Vapnik–Chervonenkis (VC) generalization bounds</b> with <b>2,000-fold Bootstrap resampling</b>. The hourglass level reflects this conservative proven floor rather than raw cross-validation AUC. Epoch Labs will not trigger its own launch until this floor rigorously clears ROC-AUC 0.60 across all validation gates.
          </p>
        </section>

        {/* SECTION 5: Open Science & Verifiable Research */}
        <section className="space-y-3 p-5 border border-[var(--rule)] bg-[var(--panel)] rounded">
          <h2 className="font-sans font-semibold text-xl text-[var(--fg-hi)] mb-2">
            5. Open Science & Transparent Research
          </h2>
          <p className="text-[var(--dim)] text-xs mb-3">
            Anyone can independently inspect the methodology, download the full labeled training dataset, reproduce the AUC score, and verify that the mathematical gates are evaluated honestly.
          </p>
          <div className="flex gap-4 font-mono text-xs flex-wrap">
            <a
              href={`${getApiBaseUrl()}/api/dataset.csv`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--panel2)] border border-[var(--banana)] text-[var(--banana)] rounded hover:bg-[var(--banana)] hover:text-[var(--ink)] transition-colors group"
            >
              <IconDownload className="w-4 h-4 text-[var(--banana)] group-hover:text-[var(--ink)] transition-colors" />
              <span>Download dataset.csv</span>
            </a>
            <a
              href={`${getApiBaseUrl()}/api/methodology.json`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--panel2)] border border-[var(--rule)] text-[var(--fg)] rounded hover:border-[var(--banana)] transition-colors"
            >
              <IconFileCode className="w-4 h-4 text-[var(--fg)]" />
              <span>View methodology.json</span>
            </a>
          </div>
        </section>
      </main>

      <FormulaStrip title="From empirical observation to a proven statistical floor" eqs={[EQ.label, EQ.vc, EQ.floor]} />

      <FooterBar />
    </div>
  );
}
