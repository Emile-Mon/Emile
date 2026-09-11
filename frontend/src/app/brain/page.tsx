'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { IdeasSection } from '@/components/ideas/IdeasSection';
import { FooterBar } from '@/components/layout/FooterBar';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';

export default function BrainPage() {
  useEmileDatabase();

  return (
    <div className="wrap min-h-screen bg-[var(--ink)] text-[var(--fg)]">
      <HeaderBar phaseText="phase 1.5 · idea generation" />
      <main className="py-6">
        <IdeasSection />
      </main>
      <FooterBar />
    </div>
  );
}
