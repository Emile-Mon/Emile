'use client';

import React, { useEffect, useRef } from 'react';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { EpochsHero } from '@/components/epochs/EpochsHero';
import { EpochTimeline } from '@/components/epochs/EpochTimeline';
import { EpochCard } from '@/components/epochs/EpochCard';
import { EpochsFooter } from '@/components/epochs/EpochsFooter';
import { useEmileDatabase } from '@/hooks/useEmileDatabase';
import { useEpochs } from '@/hooks/useEpochs';
import { useEmileStore } from '@/store/useEmileStore';

export default function EpochsPage() {
  useEmileDatabase(); // WebSocket: `epoch` and `model` events
  useEpochs();
  const data = useEmileStore((s) => s.epochs);
  const error = useEmileStore((s) => s.epochsError);
  const justCompleted = useEmileStore((s) => s.justCompleted);

  // Cards render after the fetch, so honor a deep link (/epochs#first-burn) once they exist
  const scrolled = useRef(false);
  useEffect(() => {
    if (!data || scrolled.current) return;
    scrolled.current = true;
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'instant' });
  }, [data]);

  return (
    <div className="wrap min-h-screen flex flex-col overflow-x-hidden">
      <HeaderBar phaseText={data ? `epochs · ${data.completed_count} of ${data.epochs.length}` : 'epochs'} />
      <main className="flex-1">
        <EpochsHero data={data} error={error} />

        <section className="max-w-[1180px] mx-auto w-full px-4 md:px-12 py-8 md:py-12">
          {!data && (
            <div role="status" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 font-mono text-[13px] text-[var(--dim)]">
              {error ? 'Epoch data unavailable. Statuses are only shown when they can be read from /api/epochs.' : 'Loading epochs…'}
            </div>
          )}

          {data && (
            <>
              {error && (
                <div role="status" className="mb-4 font-mono text-[11.5px] text-[var(--stall)]">
                  Could not refresh epoch data. Showing the last read.
                </div>
              )}
              <EpochTimeline epochs={data.epochs} orientation="horizontal" className="hidden md:block mb-10 px-2" />
              <div className="grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-1 gap-3 md:gap-0">
                <div className="md:hidden">
                  <EpochTimeline epochs={data.epochs} orientation="vertical" className="sticky top-4 h-[min(420px,70vh)]" />
                </div>
                <div className="space-y-4 md:space-y-5 min-w-0">
                  {data.epochs.map((e) => (
                    <EpochCard
                      key={e.id}
                      epoch={e}
                      data={data}
                      animatePour={justCompleted === e.id && e.status === 'complete'}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        <EpochsFooter data={data} />
      </main>
      <FooterBar />
    </div>
  );
}
