'use client';

import React, { useState } from 'react';
import { EPOCH_CONTRACT_ADDRESS } from '@/config/constants';

export const HeroScene: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EPOCH_CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = EPOCH_CONTRACT_ADDRESS;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="scene p-2 md:p-2.5 pt-3 pb-0 bg-[radial-gradient(115%_85%_at_46%_34%,var(--panel)_0%,var(--ink)_75%)] relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[var(--live)] opacity-5 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-60 h-60 bg-[var(--banana)] opacity-5 blur-[80px] rounded-full pointer-events-none" />

      {/* Main Container: Full Width Video Player (+20px wider layout expansion) */}
      <div className="relative z-10 w-full">
        <div className="relative w-full overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--panel)] shadow-2xl group">
          <video
            src="/videos/Stone_golem_types_at_keyboard.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-[360px] md:h-[430px] object-cover rounded-xl opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          />
          {/* Video Overlay CRT Vignette & Badge */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--ink)] via-transparent to-transparent opacity-80" />
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[10.5px] font-mono text-[var(--live)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--live)] animate-pulse" />
            LIVE EPOCH LABS FEED
          </div>

          {/* CA in Top Right Corner of Video */}
          <button
            onClick={handleCopy}
            type="button"
            className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 hover:bg-black/85 backdrop-blur-md rounded border border-white/10 hover:border-[var(--live)]/50 text-[10.5px] font-mono text-white/90 hover:text-white transition-all flex items-center gap-1.5 shadow-lg cursor-pointer group/ca z-10"
            title="Click to copy CA"
          >
            <span className="text-[var(--live)] font-semibold">CA:</span>
            <span className="hidden sm:inline font-mono">
              {EPOCH_CONTRACT_ADDRESS}
            </span>
            <span className="inline sm:hidden font-mono">
              {EPOCH_CONTRACT_ADDRESS.slice(0, 6)}...{EPOCH_CONTRACT_ADDRESS.slice(-4)}
            </span>
            {copied ? (
              <span className="text-[var(--live)] text-[10px] font-bold flex items-center gap-1 ml-0.5">
                <svg className="w-3 h-3 text-[var(--live)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                COPIED
              </span>
            ) : (
              <svg className="w-3.5 h-3.5 opacity-60 group-hover/ca:opacity-100 transition-opacity ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="scene-cap text-[var(--dim)] text-[11.5px] text-center pt-3 pb-3 font-mono relative z-10">
        It does not stop. The hourglass is the only thing that decides when it is allowed to launch.
      </div>
    </div>
  );
};
