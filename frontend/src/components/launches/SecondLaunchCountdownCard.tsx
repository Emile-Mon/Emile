'use client';

import React, { useState, useEffect } from 'react';

export const SecondLaunchCountdownCard: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(now);
      
      // Target: Today at 20:00:00 UTC
      target.setUTCHours(20, 0, 0, 0);
      
      // If current time has passed 20:00 UTC today, set target to 20:00 UTC tomorrow
      if (now.getTime() >= target.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({
        hours,
        minutes,
        seconds,
        isPast: false,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="countdown-card panel bg-[var(--panel)] border border-[var(--banana)]/40 rounded-lg p-5 mb-6 shadow-lg font-mono relative overflow-hidden">
      {/* Top Bar Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 mb-4 border-b border-[var(--rule)]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--banana)] animate-pulse shadow-[0_0_8px_var(--banana)]" />
          <h4 className="font-bold text-sm tracking-wider text-[var(--fg-hi)] uppercase m-0">
            SECOND AUTOMATED LAUNCH 20:00 UTC
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[0.68rem]">
          <span className="px-2 py-0.5 rounded bg-[var(--banana)]/15 border border-[var(--banana)]/40 text-[var(--banana)] font-bold tracking-wider uppercase">
            DAILY LAUNCH WINDOW
          </span>
          <span className="text-[var(--dim)] font-mono">SCHEDULED: 20:00 UTC</span>
        </div>
      </div>

      {/* Main Countdown Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Left: Interactive Digits */}
        <div>
          <div className="text-[0.68rem] tracking-widest text-[var(--dim)] uppercase mb-3 font-semibold">
            TIME REMAINING UNTIL NEXT AUTOMATED DEPLOYMENT
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Hours Box */}
            <div className="flex flex-col items-center">
              <div className="bg-[var(--panel2)] border border-[var(--rule)] rounded-md px-3 py-2 md:px-5 md:py-3 min-w-[70px] md:min-w-[86px] text-center shadow-inner">
                <span className="font-serif text-3xl md:text-4xl font-bold text-[var(--banana)] tracking-tight tabular-nums glow-banana">
                  {formatTwoDigits(timeLeft.hours)}
                </span>
              </div>
              <span className="text-[0.64rem] tracking-widest text-[var(--dim)] uppercase mt-1.5 font-bold">
                HOURS
              </span>
            </div>

            <span className="font-serif text-2xl md:text-3xl text-[var(--banana)] font-bold mb-4">:</span>

            {/* Minutes Box */}
            <div className="flex flex-col items-center">
              <div className="bg-[var(--panel2)] border border-[var(--rule)] rounded-md px-3 py-2 md:px-5 md:py-3 min-w-[70px] md:min-w-[86px] text-center shadow-inner">
                <span className="font-serif text-3xl md:text-4xl font-bold text-[var(--banana)] tracking-tight tabular-nums glow-banana">
                  {formatTwoDigits(timeLeft.minutes)}
                </span>
              </div>
              <span className="text-[0.64rem] tracking-widest text-[var(--dim)] uppercase mt-1.5 font-bold">
                MINUTES
              </span>
            </div>

            <span className="font-serif text-2xl md:text-3xl text-[var(--banana)] font-bold mb-4">:</span>

            {/* Seconds Box */}
            <div className="flex flex-col items-center">
              <div className="bg-[var(--panel2)] border border-[var(--rule)] rounded-md px-3 py-2 md:px-5 md:py-3 min-w-[70px] md:min-w-[86px] text-center shadow-inner">
                <span className="font-serif text-3xl md:text-4xl font-bold text-[var(--live)] tracking-tight tabular-nums glow-live">
                  {formatTwoDigits(timeLeft.seconds)}
                </span>
              </div>
              <span className="text-[0.64rem] tracking-widest text-[var(--dim)] uppercase mt-1.5 font-bold">
                SECONDS
              </span>
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="bg-[var(--panel2)]/80 border border-[var(--rule)] rounded-lg p-3.5 px-4 font-mono text-[0.72rem] max-w-xs space-y-2 text-[var(--fg)]">
          <div className="flex justify-between items-center text-[0.68rem] text-[var(--dim)] border-b border-[var(--rule)] pb-1.5 mb-1.5">
            <span>TARGET CYCLE</span>
            <span className="text-[var(--banana)] font-bold">CYCLE 1419</span>
          </div>
          <div className="flex justify-between items-center text-[0.68rem]">
            <span className="text-[var(--dim)]">CHAIN:</span>
            <span className="text-[var(--fg-hi)] font-medium">ROBINHOOD CHAIN</span>
          </div>
          <div className="flex justify-between items-center text-[0.68rem]">
            <span className="text-[var(--dim)]">DISCLOSURE:</span>
            <span className="text-[var(--live)] font-medium">PRE-COMMIT ON-CHAIN</span>
          </div>
          <div className="flex justify-between items-center text-[0.68rem]">
            <span className="text-[var(--dim)]">EXECUTION:</span>
            <span className="text-[var(--fg-hi)] font-medium">AUTONOMOUS AGENT</span>
          </div>
        </div>
      </div>

      {/* Bottom Subtitle / Note */}
      <div className="mt-4 pt-3 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-[var(--dim)] font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)]" />
          <span>Émile's automated model engine executes second daily scheduled token launch at 20:00 UTC.</span>
        </span>
        <span className="text-[var(--fg-hi)] font-medium">STATUS: MONITORING QUEUE</span>
      </div>
    </div>
  );
};
