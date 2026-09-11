'use client';

import React from 'react';

interface ConfidenceBannerProps {
  auc?: number;
  provenFloor?: number;
  confidenceLabel?: string;
}

export const ConfidenceBanner: React.FC<ConfidenceBannerProps> = ({
  auc = 0.4376,
  provenFloor = -0.1420,
  confidenceLabel = 'none'
}) => {
  return (
    <div className="conf border border-[var(--stall)] bg-[#9C5850]/[0.07] p-3 px-4 my-4 text-[0.74rem] text-[var(--fg)] rounded-md font-mono leading-relaxed">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <b className="text-[var(--fg-hi)] font-semibold">Read the scores with this attached.</b>
        <span className="uppercase text-[0.62rem] px-1.5 py-0.5 rounded border border-[var(--stall)] text-[var(--stall)] font-bold tracking-wider">
          Confidence: {confidenceLabel}
        </span>
      </div>
      <div>
        The model producing them has a measured AUC of <strong className="text-[var(--fg-hi)]">{auc.toFixed(4)}</strong> and a proven floor of{' '}
        <strong className="text-[var(--fg-hi)]">{provenFloor < 0 ? provenFloor.toFixed(4) : `+${provenFloor.toFixed(4)}`}</strong>. A score of 0.81 does not mean this token is likely to survive. It means the model ranks it above the others, and the model has not yet earned the right to be believed about anything. These numbers become meaningful only as the floor rises. Until then they are an argument Émile is having with himself in public.
      </div>
    </div>
  );
};
