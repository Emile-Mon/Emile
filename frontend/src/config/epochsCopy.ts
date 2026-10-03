// Copy for /epochs, verbatim from the Developer Brief. Text only: statuses and numbers come from /api/epochs.

export const EPOCHS_HERO = {
  title: 'Epochs',
  subtitle: 'What the sand unlocks.',
  intro:
    'Six epochs. No dates. Each one opens only when the math or the chain says so, and every unlock comes with proof you can check.',
};

export const EPOCH_COPY: Record<string, { oneLine: string; trigger: string }> = {
  ingestion: {
    oneLine: 'Golem watches every Robinhood Chain token past $10K and learns which ones reach $30K.',
    trigger: '2,000 labeled tokens',
  },
  hourglass_fill: {
    oneLine: 'The model proves it beats chance. The hourglass fills.',
    trigger: 'Proven floor ≥ 0.60 and all gates pass',
  },
  first_trade: {
    oneLine: 'Golem makes its first trade from its public wallet, signed by its own key.',
    trigger: 'First swap from the Golem wallet',
  },
  first_burn: {
    oneLine: 'The first dollar Golem wins burns the first dollar of $EPC.',
    trigger: 'First $EPC transfer to the burn address',
  },
  golem_launch: {
    oneLine: 'Golem launches a token through EpochLauncher, chosen by its own model.',
    trigger: 'First agent-signed launch',
  },
  open_golem: {
    oneLine: 'The full playbook goes public, so anyone can build a proof-gated agent.',
    trigger: 'Tagged release golem-v1',
  },
};

export const EPOCHS_FOOTER = {
  verified: 'Every epoch is verified onchain or by model run. Nothing here is unlocked by hand.',
  disclaimer: 'Research experiment. Not financial advice.',
};

// Static list for the share routes (/epochs/[slug]) that exist before any data loads.
// Names are the brief's card names; status is always fetched.
export const EPOCH_SHARE: { id: number; key: string; anchor: string; numeral: string; name: string }[] = [
  { id: 1, key: 'ingestion', anchor: 'ingestion', numeral: 'I', name: 'Ingestion' },
  { id: 2, key: 'hourglass_fill', anchor: 'hourglass-fill', numeral: 'II', name: 'The Hourglass Fill' },
  { id: 3, key: 'first_trade', anchor: 'first-trade', numeral: 'III', name: 'First Trade' },
  { id: 4, key: 'first_burn', anchor: 'first-burn', numeral: 'IV', name: 'First Burn' },
  { id: 5, key: 'golem_launch', anchor: 'golem-launch', numeral: 'V', name: 'The Golem Launch' },
  { id: 6, key: 'open_golem', anchor: 'open-golem', numeral: 'VI', name: 'Open Golem' },
];
