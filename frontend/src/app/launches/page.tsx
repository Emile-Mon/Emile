'use client';

import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { LaunchesSection } from '@/components/launches/LaunchesSection';
import { FooterBar } from '@/components/layout/FooterBar';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';

export default function LaunchesPage() {
  useEmileDatabase();

  return (
    <div className="wrap min-h-screen bg-[var(--ink)] text-[var(--fg)]">
      <HeaderBar phaseText="Émile Daily" />
      <main className="py-6">
        <LaunchesSection />
      </main>
      <FooterBar />
    </div>
  );
}
