'use client';

import React, { useState, useEffect } from 'react';

interface TwitterStatus {
  auto_post_enabled: boolean;
  is_configured: boolean;
  mode: 'live' | 'dry_run';
  post_interval_hours: number;
  managed_by_handle: string;
  next_target_token: 'emile' | 'emile_banana';
  emile_ca: string;
  emile_banana_ca: string;
  can_post_now: boolean;
  cooldown_remaining_seconds: number;
  last_post?: {
    id: number;
    target_token: string;
    status: string;
    posted_at: string;
    text: string;
  };
}

interface TweetPreview {
  target_token: 'emile' | 'emile_banana';
  ca: string;
  stats: {
    market_cap: number;
    volume_24h: number;
    liquidity: number;
    holders?: number;
  };
  tweet_text: string;
  managed_by_handle: string;
}

interface PostLog {
  id: number;
  tweet_id?: string;
  target_token: string;
  text: string;
  status: string;
  market_cap_usd?: number;
  volume_24h_usd?: number;
  posted_at: string;
  error_message?: string;
}

export function TwitterAutoPostCard() {
  const [status, setStatus] = useState<TwitterStatus | null>(null);
  const [previewTab, setPreviewTab] = useState<'emile' | 'emile_banana'>('emile');
  const [previewData, setPreviewData] = useState<TweetPreview | null>(null);
  const [history, setHistory] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/twitter/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch Twitter status:', e);
    }
  };

  const fetchPreview = async (token: 'emile' | 'emile_banana') => {
    try {
      const res = await fetch(`${API_BASE}/api/twitter/preview?target_token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data);
      }
    } catch (e) {
      console.error('Failed to fetch preview:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/twitter/history?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.posts || []);
      }
    } catch (e) {
      console.error('Failed to fetch Twitter history:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchPreview(previewTab), fetchHistory()]);
      setLoading(false);
    };
    init();

    const interval = setInterval(() => {
      fetchStatus();
      fetchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPreview(previewTab);
  }, [previewTab]);

  const handlePostNow = async (token?: 'emile' | 'emile_banana') => {
    setPosting(true);
    setMessage(null);
    try {
      const queryToken = token ? `&target_token=${token}` : '';
      const res = await fetch(`${API_BASE}/api/twitter/post-news-now?force=true${queryToken}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const statusType = data.result?.status === 'sent' ? 'Live Tweet Published!' : 'Dry-Run Logged Successfully!';
        setMessage({ type: 'success', text: `Success: ${statusType}` });
        await Promise.all([fetchStatus(), fetchHistory()]);
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to post tweet.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error triggering post.' });
    } finally {
      setPosting(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Ready to post now';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s remaining`;
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl text-slate-100 font-sans my-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              X (Twitter) 2-Hour Auto-Poster Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Alternating 100% factual on-chain data updates for Émile and Émile Banana tokens every 2 hours.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
              status?.mode === 'live'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                status?.mode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {status?.mode === 'live' ? 'Live API Active' : 'Dry-Run Mode (Safe)'}
          </div>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
          >
            {showGuide ? 'Close X Guide' : '📖 X Badge Setup Guide'}
          </button>
        </div>
      </div>

      {/* Guide Accordion */}
      {showGuide && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-3 animate-fadeIn">
          <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
            ⚙️ How to Activate Native "Automated by @emilelearns" Badge on X.com
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
            <li>Log in to X.com / Twitter app using your bot account (<code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">@emilelearns</code>).</li>
            <li>Go to <strong className="text-slate-200">Settings & privacy</strong> → <strong className="text-slate-200">Your account</strong> → <strong className="text-slate-200">Account information</strong>.</li>
            <li>Click on <strong className="text-slate-200">Automation / Automated Account</strong>.</li>
            <li>Select your developer handle or managing account as the manager.</li>
            <li>Once saved, X automatically renders <span className="text-sky-400">🤖 Automated by @emilelearns</span> under the account header on every tweet!</li>
          </ol>
          <p className="text-[11px] text-slate-500 italic">
            * Note: The badge is rendered natively by X platform UI. You do not need to type it in your tweet body.
          </p>
        </div>
      )}

      {/* Main Grid: Status & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Alternating Status & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Token Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Next Up in 2-Hour Schedule
            </span>
            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-sky-400 flex items-center gap-2">
                {status?.next_target_token === 'emile_banana' ? '🍌 Émile Banana Token' : '🌟 Émile Token'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-sky-500/10 text-sky-300 font-mono">
                Every 2 Hours
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-2 break-all bg-slate-900/90 p-2 rounded border border-slate-800">
              CA: {status?.next_target_token === 'emile_banana' ? status?.emile_banana_ca : status?.emile_ca}
            </div>
          </div>

          {/* Countdown & Timer Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Next Scheduled Post</span>
              <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                {formatCountdown(status?.cooldown_remaining_seconds || 0)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-between justify-center text-lg text-slate-400">
              ⏱️
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handlePostNow()}
              disabled={posting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {posting ? 'Processing Tweet...' : `⚡ Post Next Scheduled News Now (${status?.next_target_token === 'emile_banana' ? 'Banana' : 'Émile'})`}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePostNow('emile')}
                disabled={posting}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              >
                Post Émile Stats
              </button>
              <button
                onClick={() => handlePostNow('emile_banana')}
                disabled={posting}
                className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              >
                Post Émile Banana Stats
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-xs ${
                message.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Right Column: Live X Card Preview (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-black/90 p-5 rounded-2xl border border-slate-800 shadow-inner">
            {/* Preview Tab Selector */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                X Card Live Preview
              </span>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPreviewTab('emile')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    previewTab === 'emile' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Émile
                </button>
                <button
                  onClick={() => setPreviewTab('emile_banana')}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    previewTab === 'emile_banana' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Émile Banana
                </button>
              </div>
            </div>

            {/* Simulating Twitter/X Post Interface */}
            <div className="space-y-3 text-sm text-slate-100 font-sans">
              {/* Account Header with Official X Automated Subtitle Badge */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-lg">
                  É
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">Émile</span>
                    <span className="text-sky-400 text-xs">✓</span>
                    <span className="text-slate-500 text-xs">@emilelearns</span>
                  </div>
                  {/* Official X Native Automated Account Badge Subtitle */}
                  <div className="flex items-center gap-1 text-[11px] text-sky-400/90 font-medium">
                    <span>🤖 Automated by</span>
                    <span className="underline">{status?.managed_by_handle || '@emilelearns'}</span>
                  </div>
                </div>
              </div>

              {/* Tweet Payload Text Body */}
              <div className="whitespace-pre-wrap font-mono text-xs text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {previewData?.tweet_text || 'Loading preview text...'}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/50 flex justify-between">
                <span>100% Factual On-Chain Data</span>
                <span>DexScreener API Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Audit History Log */}
      <div className="mt-8 pt-6 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          📜 Recent Auto-Post Audit Log History
        </h3>

        {history.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
            No posts recorded yet. Click "Post Next Scheduled News Now" to create your first log entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 bg-slate-950/60">
                  <th className="p-3">Time (UTC)</th>
                  <th className="p-3">Target Token</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Market Cap</th>
                  <th className="p-3">Preview Text Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(item.posted_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          item.target_token === 'emile_banana'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {item.target_token === 'emile_banana' ? 'Émile Banana' : 'Émile'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'dry_run'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {item.market_cap_usd ? `$${Number(item.market_cap_usd).toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-slate-400 truncate max-w-xs font-mono text-[11px]">
                      {item.text.replace(/\n/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
