import { useEffect } from 'react';
import { useEmileStore } from '@/store/useEmileStore';
import { getApiBaseUrl } from '@/config/constants';
import type { EpochsPayload } from '@/components/epochs/types';

// Fallback poll in case the WebSocket drops; the backend caches for 15s and the watcher ticks every 60s.
const POLL_MS = 60_000;

export function useEpochs() {
  const setEpochs = useEmileStore((s) => s.setEpochs);
  const version = useEmileStore((s) => s.epochsVersion);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/epochs`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: EpochsPayload = await res.json();
        if (!cancelled) setEpochs(data);
      } catch (err) {
        console.warn('Epoch data unavailable:', err);
        if (!cancelled) setEpochs(null, true);
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [setEpochs, version]);
}
