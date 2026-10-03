import type { Metadata } from 'next';
import Link from 'next/link';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { FooterBar } from '@/components/layout/FooterBar';
import { TradeJournal } from '@/components/epochs/TradeJournal';
import { EPOCHS_FOOTER } from '@/config/epochsCopy';

export const metadata: Metadata = {
  title: 'Trade Journal · Epochs · Epoch Labs',
  description: 'Every swap from the Golem wallet, read from the chain, with the model call behind it.',
  alternates: { canonical: '/epochs/journal' },
};

export default function TradeJournalPage() {
  return (
    <div className="wrap min-h-screen flex flex-col overflow-x-hidden">
      <HeaderBar phaseText="epochs · trade journal" />
      <main className="flex-1 max-w-[1180px] mx-auto w-full px-4 md:px-12 py-10 md:py-14">
        <Link href="/epochs#first-trade" className="font-mono text-[11.5px] text-[var(--dim)] hover:text-[var(--banana)]">
          ← Epoch III · First Trade
        </Link>
        <h1 className="font-sans font-semibold text-4xl md:text-6xl text-[var(--fg-hi)] tracking-[-0.03em] mt-4">Trade Journal</h1>
        <p className="text-[var(--dim)] text-[15px] max-w-[60ch] mt-3 leading-relaxed">
          Every swap from the Golem wallet, read from the chain, with the model call behind it.
        </p>
        <div className="mt-8">
          <TradeJournal />
        </div>
        <p className="mt-10 font-mono text-[11.5px] text-[var(--dim)]">{EPOCHS_FOOTER.disclaimer}</p>
      </main>
      <FooterBar />
    </div>
  );
}
