'use client';

import React, { useState, useEffect } from 'react';
import { PreparingLaunchCard, PreparingLaunchData } from './PreparingLaunchCard';
import { SecondLaunchCountdownCard } from './SecondLaunchCountdownCard';
import { CalibrationStrip, CalibrationData } from './CalibrationStrip';
import { LaunchLogEntry, LaunchItemData } from './LaunchLogEntry';

export const LaunchesSection: React.FC = () => {
  const [preparingData, setPreparingData] = useState<PreparingLaunchData | undefined>(undefined);
  const [calibrationData, setCalibrationData] = useState<CalibrationData | undefined>(undefined);
  const [launchesList, setLaunchesList] = useState<LaunchItemData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchLaunchesData = async () => {
    try {
      const [resPrep, resCalib, resLaunches] = await Promise.allSettled([
        fetch(`${API_BASE}/api/launches/preparing`),
        fetch(`${API_BASE}/api/launches/calibration`),
        fetch(`${API_BASE}/api/launches`),
      ]);

      if (resPrep.status === 'fulfilled' && resPrep.value.ok) {
        const prep = await resPrep.value.json();
        setPreparingData(prep);
      }

      if (resCalib.status === 'fulfilled' && resCalib.value.ok) {
        const calib = await resCalib.value.json();
        setCalibrationData(calib);
      }

      if (resLaunches.status === 'fulfilled' && resLaunches.value.ok) {
        const list = await resLaunches.value.json();
        // Filter out test/mock history in pre-launch stage if zero real launches exist
        setLaunchesList(list);
      }
    } catch (err) {
      console.warn('Backend API unavailable, using offline fallback launch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaunchesData();
  }, [API_BASE]);

  // Section 5 Threshold calculation: Count resolved launches
  const resolvedLaunchesCount = launchesList.filter(l => l.outcome === 'passed' || l.outcome === 'stalled').length;
  const showLaunchLog = resolvedLaunchesCount >= 2;
  const showCalibrationStrip = resolvedLaunchesCount >= 5 || (calibrationData?.resolved_count ?? 0) >= 5;

  // Always render candidate card (uses default candidate data if backend fetch is pending/offline)
  const hasPreparingCandidate = preparingData === undefined || Boolean(preparingData?.name || preparingData?.prediction_sha);

  return (
    <section className="section max-w-[1120px] mx-auto p-4 md:p-8 font-mono text-[13px] leading-relaxed">
      {/* Demo Marker (Section 8) */}
      <div className="demo mb-4 border border-dashed border-[var(--stall)] p-2.5 px-4 font-mono text-[0.7rem] text-[var(--stall)] rounded bg-[var(--stall)]/5">
        DEMO DATA. Entries on this page are placeholder content for layout review before live deploy worker connection.
      </div>

      {/* Kicker & Title (§7: Header reads ÉMILE DAILY with no version number) */}
      <div className="mb-6">
        <p className="kicker text-[0.68rem] tracking-[0.18em] text-[var(--dim)] uppercase mb-2 font-mono font-bold">
          ÉMILE DAILY
        </p>
        <h2 className="font-serif font-semibold text-2xl md:text-3xl leading-tight text-[var(--fg-hi)] tracking-tight mb-3">
          One token a day, and the prediction he made before deploying it
        </h2>
        <p className="intro max-w-[66ch] text-[var(--fg)] text-sm leading-relaxed">
          Each day Émile selects one candidate from the hundred he wrote that cycle in{' '}
          <a href="/brain" className="text-[var(--banana)] hover:underline font-semibold">The Brain</a>, publishes the survival probability his model assigns to it, and presents it for launch.{' '}
          <strong className="text-[var(--fg-hi)] font-medium">
            The prediction is on the record before the outcome exists.
          </strong>{' '}
          Forty-eight hours later the token is labelled by the same rule as every other row in the dataset (did peak market cap reach $30,000) and the result lands here.
        </p>
      </div>

      {/* 1. Pre-launch card or single skipped/no-candidate line (§1) */}
      {hasPreparingCandidate ? (
        <PreparingLaunchCard data={preparingData} />
      ) : (
        <div className="no-candidate p-4 border border-[var(--rule)] bg-[var(--panel)] rounded-lg text-[0.8rem] text-[var(--dim)] font-mono mb-6">
          No candidate token is currently prepared for deployment in this cycle. (Cycle idle / skipped day).
        </div>
      )}

      {/* Second Automated Launch 20:00 UTC Countdown */}
      <SecondLaunchCountdownCard />

      {/* 2. Calibration Metric Strip (§5: only appears when resolved launches >= 5) */}
      {showCalibrationStrip && <CalibrationStrip data={calibrationData} />}

      {/* 3. Launch Log Entries Table/Panel (§5: only appears when resolved launches >= 2) */}
      {showLaunchLog && (
        <div className="panel bg-[var(--panel)] border border-[var(--rule)] rounded-lg overflow-hidden mb-6">
          <div className="phead flex justify-between items-baseline gap-4 p-3 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider text-[var(--dim)] font-mono uppercase">
            <span>LAUNCH LOG : MOST RECENT FIRST</span>
            <span>PONS V2 · ROBINHOOD CHAIN</span>
          </div>

          {launchesList.map((item, idx) => (
            <LaunchLogEntry key={item.launch_id || idx} data={item} />
          ))}
        </div>
      )}

      {/* Standing Notes (§6: In --fg rather than --dim, contrast verified at rendered size) */}
      <div className="note border-t border-[var(--rule)] pt-4 text-[0.76rem] text-[var(--fg)] max-w-[78ch] leading-relaxed font-mono">
        <b className="text-[var(--fg-hi)]">These tokens are excluded from Émile's training data.</b> They are labelled, displayed, and counted in the calibration scores once resolved, but never fed back into the model. A model that learns from its own launches is learning from its own behaviour, and the loop would destroy it within weeks. Every row carries <code>emile_launched = true</code> and the training query filters on it.
      </div>

      <div className="note border-0 pt-1 mt-2 text-[0.76rem] text-[var(--fg)] max-w-[78ch] leading-relaxed font-mono">
        <b className="text-[var(--fg-hi)]">Émile holds none of what he launches.</b> No allocation, no reserve, no team wallet. His capital goes into liquidity and stays there. He cannot sell into his own prediction because he has nothing to sell. Launch liquidity comes from a separate experiment wallet — the creator fee treasury is untouched and remains reserved for Evolution 2.
      </div>
    </section>
  );
};
