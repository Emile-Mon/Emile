import React from 'react';
import { getApiBaseUrl } from '@/config/constants';
import { EPOCHS_FOOTER } from '@/config/epochsCopy';
import type { EpochsPayload } from './types';

export const EpochsFooter: React.FC<{ data: EpochsPayload | null }> = ({ data }) => {
  const c = data?.contracts;
  const addr = (a: string) => `${c?.blockscout}/address/${a}`;
  const rows = c
    ? [
        { label: 'Golem wallet', note: 'trades and burns', address: c.golem_wallet },
        { label: 'Agent key', note: 'signs launches (EIP-712)', address: c.agent },
        { label: 'EpochLauncher', note: `chain ${c.chain_id}`, address: c.launcher },
        { label: '$EPC', note: 'token', address: c.epc_token },
        ...(c.burn_address ? [{ label: 'Burn address', note: '$EPC burns', address: c.burn_address }] : []),
      ]
    : [];

  return (
    <section className="border-t border-[var(--rule)] bg-[var(--panel2)]">
      <div className="max-w-[1180px] mx-auto px-4 md:px-12 py-10 space-y-6">
        <p className="text-[var(--fg)] text-[14px] max-w-[60ch]">{EPOCHS_FOOTER.verified}</p>

        {rows.length > 0 && (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--rule)] border border-[var(--rule)] rounded-xl overflow-hidden">
            {rows.map((r) => (
              <div key={r.label} className="bg-[var(--panel)] px-4 py-3 min-w-0">
                <dt className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--faint)]">
                  {r.label} <span className="normal-case tracking-normal">· {r.note}</span>
                </dt>
                <dd className="mt-1 font-mono text-[12px] break-all">
                  <a href={addr(r.address)} target="_blank" rel="noopener noreferrer" className="text-[var(--banana)] hover:underline">
                    {r.address}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11.5px]">
          <a href={`${getApiBaseUrl()}/api/epochs`} target="_blank" rel="noopener noreferrer" className="text-[var(--banana)] hover:underline">
            /api/epochs
          </a>
          <span className="text-[var(--dim)]">{EPOCHS_FOOTER.disclaimer}</span>
        </div>
      </div>
    </section>
  );
};
