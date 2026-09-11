'use client';

import React, { useState, useEffect } from 'react';

interface LiveSourcePanelProps {
  sha?: string;
  sourceCode?: string;
}

export const LiveSourcePanel: React.FC<LiveSourcePanelProps> = ({
  sha = '4f1c9ae72b10',
  sourceCode
}) => {
  const defaultSource = sourceCode || `# emile/ideas.py - runs once per model retrain
import random
import hashlib
from dataclasses import dataclass

@dataclass(frozen=True)
class Candidate:
    name: str          # <= 32 chars
    lore: str          # <= 280 chars
    hour: int          # 0-23, UTC
    score: float       # model.predict_proba(...)[0][1]
    commitment: str    # sha256 hex digest

def generate_cycle(run_id: int, model, n: int = 100) -> list[Candidate]:
    """
    Generate exactly 100 candidate tokens per hourly model retrain.
    RNG is deterministically seeded from sha256(run_id).
    """
    seed_hash = hashlib.sha256(str(run_id).encode("utf-8")).hexdigest()
    rng = random.Random(seed_hash)
    seen = set()
    out = []

    while len(out) < n:
        name = compose_name(rng)
        lore = compose_lore(rng, name)
        hour = rng.randrange(24)

        # reject before scoring, never after
        if not content_filter.allows(name, lore):
            continue
        if name.casefold() in seen:
            continue
        seen.add(name.casefold())

        # holders held at dataset median so features emile controls move
        x = featurise(name, lore, hour, holders=MEDIAN_HOLDERS)
        score = float(model.predict_proba(x)[0][1])

        # commitment = sha256(name \\x1f lore \\x1f hour \\x1f run_id)
        sep = b"\\x1f"
        raw_payload = name.encode() + sep + lore.encode() + sep + str(hour).encode() + sep + str(run_id).encode()
        commitment = hashlib.sha256(raw_payload).hexdigest()

        out.append(Candidate(name=name, lore=lore, hour=hour, score=score, commitment=commitment))

    out.sort(key=lambda c: -c.score)
    return out`;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedText(defaultSource);
      setIsTyping(false);
      return;
    }

    let index = 0;
    const speed = 25;
    const timer = setInterval(() => {
      if (index < defaultSource.length) {
        index += Math.min(3, defaultSource.length - index);
        setDisplayedText(defaultSource.slice(0, index));
      } else {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [defaultSource]);

  return (
    <div className="panel bg-[var(--panel)] border border-[var(--rule)] rounded-lg overflow-hidden flex flex-col h-[480px]">
      <div className="phead flex justify-between items-baseline gap-4 p-3 px-4 border-b border-[var(--rule)] text-[0.68rem] tracking-wider text-[var(--dim)] font-mono">
        <span>GENERATOR : LIVE SOURCE</span>
        <span className="sha text-[var(--banana-lo)] font-mono">sha {sha.slice(0, 8)}</span>
      </div>
      <pre className="p-4 text-[0.72rem] leading-[1.75] overflow-y-auto font-mono text-[#9FB3C8] whitespace-pre-wrap break-words flex-1 scrollbar-thin">
        {displayedText}
        {isTyping && <span className="inline-block w-[0.55em] h-[1em] bg-[var(--banana)] align-[-0.15em] animate-pulse ml-0.5" />}
      </pre>
    </div>
  );
};
