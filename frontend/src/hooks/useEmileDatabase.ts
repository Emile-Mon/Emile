import { useEffect } from 'react';
import { useEmileStore } from '@/store/useEmileStore';

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

          // Update Store with real Database metrics
          const formattedTokens = dbTokens.map((t: any) => ({
            mint: t.mint,
            name: t.name || 'Solana DEX Token',
            symbol: t.symbol || (t.mint ? t.mint.slice(0, 6).toUpperCase() : 'SOL'),
            lore: t.lore || 'No lore description provided.',
            lore_withheld: t.lore_withheld || false,
            logo: t.logo,
            holders: t.holders || 120,
            peak_mc: t.peak_mc || 10500,
            status: t.status === 'passed' ? 'passed' : 'stalled',
            hour: t.hour ?? t.launch_hour ?? (t.launched_at ? new Date(t.launched_at).getUTCHours() : 4)
          }));

          useEmileStore.setState({
            tally: {
              all: counters.above_10k ?? formattedTokens.length,
              pass: counters.passed_30k ?? 0,
              stall: counters.stalled ?? (counters.above_10k ? counters.above_10k - counters.passed_30k : formattedTokens.length)
            },
            counters: {
              pump: counters.above_10k ?? formattedTokens.length,
              dex: counters.above_10k ?? formattedTokens.length,
              rpc: counters.above_10k ?? formattedTokens.length
            },
            holdersList: [counters.median_holders || 120],
            tokens: formattedTokens
          });

          if (latestModel && latestModel.auc) {
            updateModel({
              n: latestModel.n,
              n_positive: latestModel.n_positive,
              d: latestModel.d,
              auc: latestModel.auc,
              auc_std: latestModel.auc_std,
              epsilon_vc: latestModel.epsilon_vc,
              auc_boot_lower: latestModel.auc_boot_lower,
              proven_floor: latestModel.proven_floor,
              jar_level: latestModel.jar_level,
              gates: latestModel.gates,
              blocked_by: latestModel.blocked_by
            });

            setSimParams({
              n: latestModel.n,
              auc: latestModel.auc,
              d: latestModel.d
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
            addToken(payload.token);
          }
          if (payload.model) {
            updateModel(payload.model);
            setSimParams({
              n: payload.model.n,
              auc: payload.model.auc
            });
          }
        } catch {
          // Ignore invalid WS payloads
        }
      };
    } catch {
      setConnected(false);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [addToken, updateModel, setSimParams, setConnected]);
}
