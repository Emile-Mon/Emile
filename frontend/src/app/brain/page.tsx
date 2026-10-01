'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { IdeasSection } from '@/components/ideas/IdeasSection';
import { FooterBar } from '@/components/layout/FooterBar';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';
import { FormulaStrip } from '@/components/math/FormulaStrip';
import { EQ } from '@/config/equations';

export default function BrainPage() {
  useEmileDatabase();

  return (
    <div className="wrap min-h-screen bg-[var(--ink)] text-[var(--fg)]">
      <HeaderBar phaseText="phase 1.5 · idea generation" />
      <main className="py-6">
        <IdeasSection />
      </main>
      <FormulaStrip title="How an idea is scored and committed" eqs={[EQ.ideaScore, EQ.choice, EQ.commit]} />
      <FooterBar />
    </div>
  );
}
