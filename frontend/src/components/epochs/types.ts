// Shape of GET /api/epochs. Every status and number here comes from the backend; nothing is derived client-side.

export type EpochStatus = 'locked' | 'active' | 'complete';

export interface EpochProof {
  type: 'model_run' | 'tx' | 'release';
  run_id?: number;
  hash?: string;
  url?: string;
  token_address?: string;
  token_url?: string;
  amount_wei?: string;
  license?: string | null;
  methodology?: Record<string, unknown>;
}

export interface EpochProgress {
  current: number;
  target: number;
  unit: 'samples' | 'proven_floor';
  run_id: number;
  jar_level?: number;
  gates?: Record<string, boolean>;
  blocked_by?: string | null;
}

export interface EpochItem {
  id: number;
  key: string;
  name: string;
  anchor: string;
  status: EpochStatus;
  progress: EpochProgress | null;
  proof: EpochProof | null;
  completed_at: string | null;
}

export interface EpochsModel {
  run_id: number;
  n: number;
  proven_floor: number;
  jar_level: number;
  blocked_by: string | null;
}

export interface EpochsPayload {
  active: number | null;
  completed_count: number;
  golem_paused: string | null;
  model: EpochsModel | null;
  target_auc: number;
  floor_auc: number;
  epochs: EpochItem[];
  burns: { total_wei: string; count: number };
  contracts: {
    chain_id: number;
    launcher: string;
    token_template: string;
    agent: string;
    golem_wallet: string;
    burn_address: string | null;
    epc_token: string;
    uniswap_v2_router: string;
    launcher_owner: string;
    blockscout: string;
  };
}

export interface EpochEvent {
  id: number;
  status: 'complete';
  proof: EpochProof;
  completed_at: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const roman = (id: number) => ROMAN[id - 1] ?? String(id);

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const formatUtc = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '—';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
  } catch {
    return iso || '—';
  }
};

/** 18-decimal wei string to a readable token amount, exact (BigInt, no float rounding). */
export const formatTokenAmount = (wei: string, decimals = 18, maxFraction = 2) => {
  const v = BigInt(wei || '0');
  const base = BigInt(10) ** BigInt(decimals);
  const whole = (v / base).toLocaleString('en-US');
  const frac = (v % base).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
};

// GET /api/trades
export interface TradeItem {
  tx_hash: string;
  tx_url: string;
  at: string;
  side: 'buy' | 'sell' | 'swap';
  token: string | null;
  token_url: string | null;
  token_amount_wei: string | null;
  eth_amount_wei: string | null;
  survival_probability: number | null;
  top_signal: string | null;
  run_id: number | null;
  result_wei: string | null;
  partial_basis: boolean;
}

export interface TradesPayload {
  trades: TradeItem[];
  summary: { count: number; closed: number; wins: number; losses: number; realized_wei: string };
  golem_wallet: string;
  golem_wallet_url: string;
  can_trade: boolean;
  paused_reason: string | null;
}

/** Signed wei string ("-1500000000000000000") to "−1.5" / "+1.5". */
export const formatSignedEth = (wei: string, maxFraction = 4) => {
  const neg = wei.startsWith('-');
  const abs = formatTokenAmount(neg ? wei.slice(1) : wei, 18, maxFraction);
  if (abs === '0') return '0';
  return `${neg ? '−' : '+'}${abs}`;
};
