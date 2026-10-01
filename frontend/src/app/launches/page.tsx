'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { LaunchesSection } from '@/components/launches/LaunchesSection';
import { FooterBar } from '@/components/layout/FooterBar';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';
import { FormulaStrip } from '@/components/math/FormulaStrip';
import { EQ } from '@/config/equations';

export default function LaunchesPage() {
  useEmileDatabase();

  return (
    <div className="wrap min-h-screen bg-[var(--ink)] text-[var(--fg)]">
      <HeaderBar phaseText="Epoch Labs Daily" />
      <main className="py-6">
        <LaunchesSection />
      </main>
      <FormulaStrip title="How a launched prediction is graded" eqs={[EQ.brier, EQ.brierSkill]} />
      <FooterBar />
    </div>
  );
}
