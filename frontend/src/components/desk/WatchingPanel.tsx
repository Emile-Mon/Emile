'use client';

import React from 'react';
import { DESK_COPY } from '@/config/deskCopy';
import { Cell, Empty, HeadRow, Panel, SurvivalBar, rowClass, useNow } from './DeskUi';
import { STAGE_LABEL, ageSince, fmtCount, fmtUsdCompact, tokenLabel, type DeskPayload, type WatchingRow } from './types';

const WATCH_COLS = 'md:grid-cols-[minmax(0,1.4fr)_0.75fr_0.65fr_0.6fr_1fr_1.05fr]';

const STATUS: Record<WatchingRow['status'], { label: string; cls: string }> = {
  scoring: { label: 'scoring', cls: 'text-[var(--banana)]' },
  below_threshold: { label: 'below threshold', cls: 'text-[var(--dim)] text-[11.5px]' },
  unscored: { label: 'unscored', cls: 'text-[var(--faint)]' },
  awaiting_holders: { label: 'counting holders', cls: 'text-[var(--faint)]' },
  excluded: { label: 'excluded', cls: 'text-[var(--faint)]' },
};

export const WatchingPanel: React.FC<{ data: DeskPayload }> = ({ data }) => {
  const now = useNow(30_000);
  return (
    <Panel
      id="watching"
      title="Watching"
      count={data.watching.length}
      note={
        `Tokens past $10K from the public ingest feed, scored by model run ${data.model?.run_id ?? '—'}. ` +
        `Entry threshold ${data.threshold.toFixed(2)}. Holders are counted onchain now, while the model was trained ` +
        `on 48-hour counts: these scores are not reliable yet. Team tokens are never traded.` +
        (data.watching_not_onchain
          ? ` ${data.watching_not_onchain} feed ${data.watching_not_onchain === 1 ? 'entry is' : 'entries are'} hidden: no contract on Robinhood Chain.`
          : '')
      }
    >
      {data.watching.length === 0 ? (
        <Empty>No tokens in the feed right now.</Empty>
      ) : (
        <>
          <HeadRow cols={WATCH_COLS} labels={['Token', 'Peak MC', 'Age', 'Holders now', 'Survival', 'Status']} />
          <ol className="space-y-2 md:space-y-1.5">
            {data.watching.map((r) => (
              <li key={r.token.address} className={rowClass(WATCH_COLS)}>
                <Cell label="Token" first>
                  <span className="text-[var(--fg-hi)] font-sans font-semibold text-[14px]">{tokenLabel(r.token)}</span>
                  {r.token.name && r.token.symbol && (
                    <span className="ml-2 text-[var(--dim)] text-[11.5px]">{r.token.name}</span>
                  )}
                </Cell>
                <Cell label="Peak MC">{fmtUsdCompact(r.peak_mc)}</Cell>
                <Cell label="Age">{ageSince(r.launched_at, now)}</Cell>
                <Cell label="Holders now">{fmtCount(r.holders)}</Cell>
                <Cell label="Survival">
                  <SurvivalBar value={r.survival} threshold={data.threshold} />
                </Cell>
                <Cell label="Status">
                  <span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span>
                </Cell>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
};

export const WaitingPanel: React.FC<{ data: DeskPayload }> = ({ data }) => {
  const now = useNow(10_000);
  const gated = data.state === 'gated';
  return (
    <Panel id="waiting" title="Waiting for entry" count={data.waiting.filter((w) => w.stage !== 'dropped').length} note={DESK_COPY.waitingAnon}>
      {data.waiting.length === 0 ? (
        <Empty>{gated ? 'Golem does not queue candidates until the hourglass is full.' : DESK_COPY.waitingEmpty}</Empty>
      ) : (
        <ol className="space-y-2">
          {data.waiting.map((w) => {
            const dropped = w.stage === 'dropped';
            return (
              <li
                key={w.slot}
                className={`rounded-xl border px-4 py-3 ${dropped ? 'border-[var(--border)] bg-transparent opacity-75' : 'border-[var(--banana)]/40 bg-[var(--panel)]'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[14px] text-[var(--fg-hi)]">Candidate #{w.slot}</span>
                  <span className="font-mono text-[11px] text-[var(--dim)]">queued {ageSince(w.queued_at, now)} ago</span>
                </div>
                <div className={`mt-1 font-mono text-[12px] ${dropped ? 'text-[var(--stall)]' : w.stage === 'entering' ? 'text-[var(--banana)] desk-pulse-text' : 'text-[var(--fg)]'}`}>
                  {dropped ? `Dropped: ${w.dropped_reason}` : `survival ≥ ${data.threshold.toFixed(2)} · ${STAGE_LABEL[w.stage]}`}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {data.dropped_revealed.length > 0 && (
        <details className="mt-3 font-mono text-[11.5px] text-[var(--dim)]">
          <summary className="cursor-pointer hover:text-[var(--fg)]">Dropped candidates, revealed after 48 hours ({data.dropped_revealed.length})</summary>
          <ul className="mt-2 space-y-1">
            {data.dropped_revealed.map((d) => (
              <li key={d.slot} className="flex flex-wrap gap-x-2">
                <span className="text-[var(--fg)]">#{d.slot}</span>
                <a href={d.token.url} target="_blank" rel="noopener noreferrer" className="text-[var(--banana)] hover:underline">{tokenLabel(d.token)}</a>
                <span>survival {d.survival.toFixed(2)}</span>
                <span>· {d.dropped_reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
};
