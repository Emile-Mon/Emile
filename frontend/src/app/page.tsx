import React from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { HeroScene } from '@/components/hero/HeroScene';
import { CrtTerminal } from '@/components/crt/CrtTerminal';
import { StatsStrip } from '@/components/analytics/StatsStrip';
import { ProofPanel } from '@/components/analytics/ProofPanel';
import { FooterBar } from '@/components/layout/FooterBar';

export default function HomePage() {
  return (
    <div className="wrap">
      <HeaderBar phaseText="phase 1 · learning" />
      <div className="hero hero-grid grid grid-cols-[1.22fr_1.1fr] relative">
        <HeroScene />
        <CrtTerminal />
      </div>
      <StatsStrip />
      <ProofPanel />
      <FooterBar />
    </div>
  );
}
