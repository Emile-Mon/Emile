import React from 'react';
import { roman, type EpochItem } from './types';

interface Props {
  epochs: EpochItem[];
  orientation: 'horizontal' | 'vertical';
  className?: string;
}

// Six dots joined by a sand line; the line is filled amber up to the active epoch (or fully once all are complete).
export const EpochTimeline: React.FC<Props> = ({ epochs, orientation, className = '' }) => {
  const lastIdx = epochs.length - 1;
  const activeIdx = epochs.findIndex((e) => e.status === 'active');
  const reachedIdx = activeIdx === -1 ? (epochs.every((e) => e.status === 'complete') ? lastIdx : 0) : activeIdx;
  const fill = lastIdx > 0 ? (reachedIdx / lastIdx) * 100 : 0;
  const horizontal = orientation === 'horizontal';

  return (
    <nav aria-label="Epoch timeline" className={className}>
      <ol className={`relative flex ${horizontal ? 'flex-row justify-between items-start' : 'flex-col justify-between items-center h-full gap-6'}`}>
        {/* Sand line: track + amber fill */}
        <span
          aria-hidden
          className={`absolute bg-[var(--border-strong)] rounded-full ${horizontal ? 'left-12 right-12 top-[15px] h-[3px]' : 'top-4 bottom-4 left-1/2 -translate-x-1/2 w-[3px]'}`}
        >
          <span
            className="absolute left-0 top-0 rounded-full bg-[var(--banana)] epoch-line-fill"
            style={horizontal ? { width: `${fill}%`, height: '100%' } : { height: `${fill}%`, width: '100%' }}
          />
        </span>

        {epochs.map((e) => {
          const dot =
            e.status === 'complete'
              ? 'bg-[var(--banana)] border-[var(--banana)] text-[var(--ink)]'
              : e.status === 'active'
                ? 'bg-[var(--ink)] border-[var(--banana)] text-[var(--banana)] epoch-dot-active'
                : 'bg-[var(--ink)] border-[var(--border-strong)] text-[var(--faint)]';
          return (
            <li key={e.id} className={`relative z-10 ${horizontal ? 'flex flex-col items-center w-24' : ''}`}>
              <a
                href={`#${e.anchor}`}
                className={`flex items-center justify-center rounded-full border-2 font-serif text-[13px] w-8 h-8 transition-colors hover:border-[var(--banana-hi)] focus-visible:outline-2 focus-visible:outline-[var(--banana)] ${dot}`}
                aria-label={`Epoch ${roman(e.id)}: ${e.name} (${e.status})`}
                aria-current={e.status === 'active' ? 'step' : undefined}
              >
                {roman(e.id)}
              </a>
              {horizontal && (
                <span className={`mt-2 text-center font-mono text-[10.5px] uppercase tracking-wider leading-tight ${e.status === 'locked' ? 'text-[var(--faint)]' : 'text-[var(--fg)]'}`}>
                  {e.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
