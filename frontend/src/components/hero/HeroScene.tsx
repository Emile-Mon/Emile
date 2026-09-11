import React, { useState } from 'react';
import { EMILE_CONTRACT_ADDRESS } from '@/config/constants';

export const HeroScene: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyCA = () => {
    navigator.clipboard.writeText(EMILE_CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="scene p-2 md:p-2.5 pt-3 pb-0 bg-[radial-gradient(115%_85%_at_46%_34%,#121B27_0%,var(--ink)_75%)] relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[var(--live)] opacity-5 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-60 h-60 bg-[var(--banana)] opacity-5 blur-[80px] rounded-full pointer-events-none" />

      {/* Main Container: Full Width Video Player (+20px wider layout expansion) */}
      <div className="relative z-10 w-full">
        <div className="relative w-full overflow-hidden rounded-xl border border-[var(--rule)] bg-[#080E14] shadow-2xl group">
          <video
            src="/videos/Monkey_typing_on_keyboard.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-[360px] md:h-[430px] object-cover rounded-xl opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          />
          {/* Video Overlay CRT Vignette & Badge */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#06090D] via-transparent to-transparent opacity-80" />
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[10.5px] font-mono text-[#9ED8B3] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--live)] animate-pulse" />
            LIVE ÉMILE FEED
          </div>

          {/* Full Contract Address Pill Button (Icon Only, No COPY Text, Full CA String) */}
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={handleCopyCA}
              className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg border border-[var(--banana)]/50 hover:border-[var(--banana)] text-xs font-mono text-[var(--fg)] flex items-center gap-2 cursor-pointer group shadow-xl transition-all duration-200"
              title="Click to copy $EMILE Contract Address"
            >
              <span className="text-[var(--banana)] font-bold">CA:</span>
              <span className="text-[11px] font-mono text-[#F1F6FA] select-all font-semibold tracking-tight">
                {EMILE_CONTRACT_ADDRESS}
              </span>
              <span className={`p-1 rounded transition-colors flex items-center justify-center ${copied ? 'bg-[var(--live)] text-[var(--ink)]' : 'bg-[var(--banana)] text-[var(--ink)] group-hover:bg-[#FFE885]'}`}>
                {copied ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="scene-cap text-[var(--dim)] text-[11.5px] text-center pt-3 pb-3 font-mono relative z-10">
        He does not stop. The jar is the only thing that decides when he is allowed to launch.
      </div>
    </div>
  );
};
