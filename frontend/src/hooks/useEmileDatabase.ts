import { useEffect } from 'react';
import { useEmileStore, TokenItem } from '@/store/useEmileStore';

export function useEmileDatabase() {
  const addToken = useEmileStore((state) => state.addToken);
  const updateModel = useEmileStore((state) => state.updateModel);
  const setSimParams = useEmileStore((state) => state.setSimParams);
  const setConnected = useEmileStore((state) => state.setConnected);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

    // 1. Fetch initial snapshot state from PostgreSQL DB via REST API
    async function fetchStateFromDB() {
      try {
        const res = await fetch(`${apiBase}/api/state`);
        if (res.ok) {
          const data = await res.json();
          const counters = data.counters || {};
          const latestModel = data.latest_model || {};
          const dbTokens = data.tokens || [];

          // Deduplicate tokens by mint address
          const uniqueMap = new Map();
          dbTokens.forEach((t: any) => {
            if (t.mint && !uniqueMap.has(t.mint)) {
              uniqueMap.set(t.mint, t);
            }
          });
          const uniqueTokens = Array.from(uniqueMap.values());

          // Update Store with real Database metrics
          const formattedTokens = uniqueTokens.map((t: any) => ({
            mint: t.mint,
            name: t.name || 'Robinhood Chain Token',
            symbol: t.symbol || (t.mint ? t.mint.slice(0, 6).toUpperCase() : 'SOL'),
            lore: t.lore || 'No lore description provided.',
            lore_withheld: t.lore_withheld || false,
            logo: t.logo,
            holders: t.holders || 120,
            peak_mc: t.peak_mc || 10500,
            status: ((t.status === 'passed' || (t.peak_mc && t.peak_mc >= 30000)) ? 'passed' : 'stalled') as 'passed' | 'stalled' | 'pending',
            hour: t.hour ?? t.launch_hour ?? (t.launched_at ? new Date(t.launched_at).getUTCHours() : 4),
            launched_at: t.launched_at
          }));

          const totalTokensInDB = counters.above_10k ?? formattedTokens.length;

          useEmileStore.setState({
            tally: {
              all: totalTokensInDB,
              pass: counters.passed_30k ?? 0,
              stall: counters.stalled ?? (counters.above_10k ? counters.above_10k - counters.passed_30k : formattedTokens.length)
            },
            counters: {
              pump: totalTokensInDB,
              dex: totalTokensInDB,
              rpc: totalTokensInDB
            },
            holdersList: [counters.median_holders || 120],
            tokens: formattedTokens,
            simState: {
              n: totalTokensInDB,
              auc: latestModel?.auc || 0.544,
              d: latestModel?.d || 41,
              running: false
            }
          });

          if (latestModel && latestModel.auc) {
            updateModel({
              n: latestModel.n || totalTokensInDB,
              n_positive: latestModel.n_positive || (counters.passed_30k ?? 0),
              d: latestModel.d || 41,
              auc: latestModel.auc,
              auc_std: latestModel.auc_std,
              epsilon_vc: latestModel.epsilon_vc,
              auc_boot_lower: latestModel.auc_boot_lower,
              proven_floor: latestModel.proven_floor,
              jar_level: latestModel.jar_level,
              gates: latestModel.gates,
              blocked_by: latestModel.blocked_by,
              feature_importance: latestModel.feature_importance
            });
          }
        }
      } catch (err) {
        console.warn('Backend REST API unavailable, using cached state:', err);
      }
    }

    fetchStateFromDB();

    // 2. Connect to WebSocket stream for live events
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsBase}/stream`);
      socket.onopen = () => setConnected(true);
      socket.onclose = () => setConnected(false);
      socket.onerror = () => setConnected(false);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.token) {
            const raw = payload.token;
            const newItem: TokenItem = {
              mint: raw.mint,
              name: raw.name || 'Robinhood Chain Token',
              symbol: raw.symbol || (raw.mint ? raw.mint.slice(0, 6).toUpperCase() : 'SOL'),
              lore: raw.lore || 'No lore description provided.',
              holders: raw.holders || 120,
              peak_mc: raw.peak_mc || 10500,
              status: ((raw.status === 'passed' || (raw.peak_mc && raw.peak_mc >= 30000)) ? 'passed' : 'stalled') as 'passed' | 'stalled' | 'pending',
              hour: raw.hour ?? new Date().getUTCHours(),
              launched_at: raw.launched_at || new Date().toISOString()
            };
            addToken(newItem);

            // Sync simState.n live with updated DB total
            const curState = useEmileStore.getState();
            setSimParams({ n: curState.tally.all });
          }
          if (payload.model) {
            updateModel(payload.model);
            setSimParams({
              n: payload.model.n,
              auc: payload.model.auc
            });
          }
        } catch (e) {
          // Ignore invalid WS payloads
        }
      };
    } catch (e) {
      setConnected(false);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [addToken, updateModel, setSimParams, setConnected]);
}
