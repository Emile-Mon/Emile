'use client';

import React from 'react';

export const HeroScene: React.FC = () => {
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
        </div>
      </div>

      <div className="scene-cap text-[var(--dim)] text-[11.5px] text-center pt-3 pb-3 font-mono relative z-10">
        He does not stop. The jar is the only thing that decides when he is allowed to launch.
      </div>
    </div>
  );
};
