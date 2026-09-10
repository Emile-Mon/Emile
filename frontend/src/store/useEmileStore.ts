import { create } from 'zustand';

export interface TokenItem {
  mint: string;
  name: string;
  symbol: string;
  lore: string | null;
  lore_withheld?: boolean;
  logo?: string;
  holders: number;
  peak_mc: number;
  status: 'passed' | 'stalled' | 'pending';
  hour: number;
  launched_at?: string;
  hue?: number;
}

export interface ModelMetrics {
  n: number;
  n_positive: number;
  d: number;
  auc: number;
  auc_std: number;
  epsilon_vc: number;
  auc_boot_lower: number;
  proven_floor: number;
  jar_level: number;
  gates: Record<string, boolean>;
  blocked_by: string | null;
  hour_rates?: Record<string, number>;
  feature_importance?: Record<string, number>;
}

interface EmileState {
  // Connection & Data state
  isConnected: boolean;
  stage: string;
  codeBuffer: string;
  tokens: TokenItem[];
  counters: {
    pump: number;
    dex: number;
    rpc: number;
  };
  tally: {
    all: number;
    pass: number;
    stall: number;
  };
  holdersList: number[];
  
  // Model state
  model: ModelMetrics;
  
  // Interactive Simulation state
  simState: {
    n: number;
    auc: number;
    d: number;
    running: boolean;
  };

  // Actions
  setConnected: (connected: boolean) => void;
  setStage: (stage: string) => void;
  setCodeBuffer: (code: string) => void;
  addToken: (token: TokenItem) => void;
  updateModel: (model: Partial<ModelMetrics>) => void;
  setSimParams: (params: Partial<{ n: number; auc: number; d: number; running: boolean }>) => void;
  resetSim: () => void;
}

const HUES = [38, 152, 268, 196, 12, 88, 320];

export const useEmileStore = create<EmileState>((set, get) => ({
  isConnected: true,
  stage: 'ingest · robinhood chain',
  codeBuffer: '',
  tokens: [],
  counters: { pump: 0, dex: 0, rpc: 0 },
  tally: { all: 0, pass: 0, stall: 0 },
  holdersList: [],

  model: {
    n: 2346,
    n_positive: 723,
    d: 28,
    auc: 0.9483,
    auc_std: 0.0087,
    epsilon_vc: 0.274,
    auc_boot_lower: 0.9999,
    proven_floor: 0.6743,
    jar_level: 0.95,
    gates: { n_samples: true, n_positive: true, auc_std: true, time_split: false },
    blocked_by: 'time_split'
  },

  simState: {
    n: 2346,
    auc: 0.9483,
    d: 28,
    running: true
  },

  setConnected: (connected) => set({ isConnected: connected }),
  setStage: (stage) => set({ stage }),
  setCodeBuffer: (codeBuffer) => set({ codeBuffer }),

  addToken: (token) => {
    // Drop queued events if tab is in background or document hidden
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const hue = token.hue ?? HUES[Math.floor(Math.random() * HUES.length)];
    const item = { ...token, hue };

    set((state) => {
      const isExisting = state.tokens.some(t => t.mint === item.mint);
      const filtered = state.tokens.filter(t => t.mint !== item.mint);
      const newTokens = [item, ...filtered].slice(0, 50); // Cap DOM at 50 rows
      const isPassed = item.status === 'passed';
      
      const newTally = isExisting ? state.tally : {
        all: state.tally.all + 1,
        pass: state.tally.pass + (isPassed ? 1 : 0),
        stall: state.tally.stall + (!isPassed ? 1 : 0)
      };

      const newHolders = [...state.holdersList, item.holders].slice(-4000);
      const newCounters = isExisting ? state.counters : {
        pump: state.counters.pump + 1,
        dex: state.counters.dex + 1,
        rpc: state.counters.rpc + 1
      };

      return {
        tokens: newTokens,
        tally: newTally,
        holdersList: newHolders,
        counters: newCounters
      };
    });
  },

  updateModel: (metrics) => set((state) => ({ model: { ...state.model, ...metrics } })),

  setSimParams: (params) => set((state) => ({ simState: { ...state.simState, ...params } })),

  resetSim: () => set({
    simState: { n: 340, auc: 0.548, d: 28, running: true }
  })
}));
