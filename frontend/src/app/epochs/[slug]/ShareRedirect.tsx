'use client';

import { useEffect } from 'react';

export function ShareRedirect({ anchor, label }: { anchor: string; label: string }) {
  useEffect(() => {
    window.location.replace(`/epochs#${anchor}`);
  }, [anchor]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 font-mono text-[13px] text-[var(--dim)]">
      <a href={`/epochs#${anchor}`} className="text-[var(--banana)] underline underline-offset-2">
        {label}
      </a>
    </main>
  );
}
