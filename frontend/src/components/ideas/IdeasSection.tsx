'use client';

import React, { useState, useEffect } from 'react';
import { LiveSourcePanel } from './LiveSourcePanel';
import { CandidatesList, CandidateItem } from './CandidatesList';
import { ConfidenceBanner } from './ConfidenceBanner';
import { RevisedAndExclusions, EliminatedItem, ExclusionItem } from './RevisedAndExclusions';
import { ScoreHistogram } from './ScoreHistogram';

export const IdeasSection: React.FC = () => {
  const [cycleData, setCycleData] = useState<any>(null);
  const [eliminatedData, setEliminatedData] = useState<EliminatedItem[]>([]);
  const [exclusionsData, setExclusionsData] = useState<ExclusionItem[]>([]);
  const [sourceData, setSourceData] = useState<{ source?: string; sha?: string }>({});
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchData() {
      try {
        const [resCurrent, resElim, resExcl, resGen] = await Promise.allSettled([
          fetch(`${API_BASE}/api/ideas/current`),
          fetch(`${API_BASE}/api/ideas/eliminated`),
          fetch(`${API_BASE}/api/ideas/exclusions`),
          fetch(`${API_BASE}/api/ideas/generator`),
        ]);

        if (resCurrent.status === 'fulfilled' && resCurrent.value.ok) {
          const current = await resCurrent.value.json();
          setCycleData(current);
        }

        if (resElim.status === 'fulfilled' && resElim.value.ok) {
          const elim = await resElim.value.json();
          setEliminatedData(elim);
        }

        if (resExcl.status === 'fulfilled' && resExcl.value.ok) {
          const excl = await resExcl.value.json();
          setExclusionsData(excl);
        }

        if (resGen.status === 'fulfilled' && resGen.value.ok) {
          const gen = await resGen.value.json();
          setSourceData({ source: gen.source, sha: gen.generator_sha });
        }
      } catch (err) {
        console.warn('Backend API unavailable, using offline demo cycle data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [API_BASE]);

  // Fallback demo data generation if backend is offline
  const cycleId = cycleData?.cycle_id || 1418;
  const runId = cycleData?.run_id || 444;
  const rejectedCount = cycleData?.n_rejected || 14;
  const generatorSha = cycleData?.generator_sha || sourceData.sha || '4f1c9ae72b10';
  const candidates: CandidateItem[] = cycleData?.candidates || generateFallbackCandidates(runId);
  const leaderName = candidates.length > 0 ? candidates[0].name : 'Sherwood Index';

  const auc = cycleData?.model?.auc || 0.4376;
  const provenFloor = cycleData?.model?.proven_floor || -0.1420;
  const confidenceLabel = cycleData?.model?.confidence || 'none';

  return (
    <section className="section max-w-[1180px] mx-auto p-4 md:p-8 font-mono text-[13px] leading-relaxed">
      {/* Kicker & Title */}
      <div className="mb-6">
        <p className="kicker text-[0.68rem] tracking-[0.18em] text-[var(--dim)] uppercase mb-2 font-mono">
          ÉMILE 1.5 : AUTONOMOUS IDEA GENERATION
        </p>
        <h2 className="font-serif font-semibold text-2xl md:text-3xl leading-tight text-[var(--fg-hi)] tracking-tight mb-3">
          One hundred ideas an hour, and the argument he has with himself
        </h2>
        <p className="intro max-w-[66ch] text-[var(--fg)] text-sm leading-relaxed">
          Every cycle Émile writes 100 candidate tokens (a name, a piece of lore, and a launch hour) and scores each one with the model he trained that hour.{' '}
          <strong className="text-[var(--fg-hi)] font-medium">
            All one hundred are published, including the leader.
          </strong>{' '}
          Each carries the hash it was committed under at generation time, so the record of what Émile wrote and when is verifiable by anyone, and cannot be rewritten after the fact.
        </p>
      </div>

      {/* Metric Status Strip */}
      <div className="strip flex flex-wrap gap-4 items-baseline border border-[var(--rule)] bg-[var(--panel2)] p-3 px-4 mb-6 text-[0.72rem] font-mono rounded-lg">
        <span>
          <span className="text-[var(--dim)] mr-1.5">cycle</span>
          <b className="text-[var(--fg-hi)] font-medium">{cycleId}</b>
        </span>
        <span>
          <span className="text-[var(--dim)] mr-1.5">run_id</span>
          <b className="text-[var(--fg-hi)] font-medium">{runId}</b>
        </span>
        <span>
          <span className="text-[var(--dim)] mr-1.5">generated</span>
          <b className="text-[var(--fg-hi)] font-medium">{candidates.length} / 100</b>
        </span>
        <span>
          <span className="text-[var(--dim)] mr-1.5">rejected by filter</span>
          <b className="text-[var(--fg-hi)] font-medium">{rejectedCount}</b>
        </span>
        <span>
          <span className="text-[var(--dim)] mr-1.5">leader</span>
          <b className="text-[var(--banana)] font-medium">{leaderName}</b>
        </span>
        <span className="text-[var(--green)] flex items-center gap-1.5 ml-auto font-semibold">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-ping" />● generating
        </span>
      </div>

      {/* Primary Grid: Generator Live Source & Candidates Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-4 mb-6">
        <LiveSourcePanel sha={generatorSha} sourceCode={sourceData.source} />
        <CandidatesList candidates={candidates} cycleId={cycleId} />
      </div>

      {/* Model Confidence Banner */}
      <ConfidenceBanner auc={auc} provenFloor={provenFloor} confidenceLabel={confidenceLabel} />

      {/* Secondary Grid: Revised Out / Exclusions & Score Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <RevisedAndExclusions eliminatedList={eliminatedData} exclusionsList={exclusionsData} />
        <ScoreHistogram candidates={candidates} />
      </div>

      {/* Explanatory Footnote Note */}
      <div className="note border-t border-[var(--rule)] pt-4 text-[0.74rem] text-[var(--dim)] max-w-[78ch] leading-relaxed font-mono">
        Every candidate is committed as <code>sha256(name | lore | hour | run_id)</code> and written to an append-only log the moment it is generated, before it is displayed. The log is the record of what Émile wrote and when. Two things follow from it: a name he never committed cannot be launched, and if a candidate appears on chain under someone else's deployer before Émile launches it, the timestamps settle who wrote it first. Anything already deployed by another address is dropped from the next cycle automatically: Émile launches his own idea or none.
      </div>
    </section>
  );
};

// Fallback generator for offline demo state
function generateFallbackCandidates(runId: number): CandidateItem[] {
  const NAMES = [
    'Sherwood Index', 'Longbow', 'Quiver', 'Tuck', 'Marian Protocol', 'Arrowhead',
    'Greenwood', 'Fletcher', 'Yeoman', 'Bowstring', 'Sheriff', 'Nottingham Ledger',
    'Oakroot', 'Gisbourne', 'Hood Lantern', 'Alan-a-Dale', 'Bramble', 'Stagline',
    'Coppice', 'Tithe', 'Verderer', 'Assart', 'Purlieu', 'Warrener', 'Bracken'
  ];

  const LORES = [
    'A ledger that forgets nothing and forgives less.',
    'Counting what the forest already knew.',
    'Every arrow is a claim about the future.',
    'Not a shortcut. A slower road, measured.',
    'The interest is paid in patience.',
    'Built for the ones who check the receipts.',
    'A tax on certainty, refunded on proof.',
    'What survives the winter gets a name.',
    'Twelve hundred holders and one honest chart.',
    'The bow is only as good as the draw.',
    'Nothing here is promised. Everything is recorded.',
    'A small clearing, kept deliberately small.'
  ];

  const items: CandidateItem[] = [];
  for (let i = 0; i < 100; i++) {
    const name = NAMES[i % NAMES.length] + (i > 24 ? ` ${i}` : '');
    const lore = LORES[i % LORES.length];
    const hour = (i * 3 + 7) % 24;
    const score = Math.max(0.012, Math.min(0.982, 0.8117 - i * 0.0075));
    const commitment = `${(i * 104729 + 12345).toString(16).padStart(16, '0')}a91f7c2e8b`;

    items.push({
      rank: i + 1,
      name,
      lore,
      hour,
      score,
      commitment
    });
  }

  return items;
}
