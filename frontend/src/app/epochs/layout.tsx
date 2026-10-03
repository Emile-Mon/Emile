import type { Metadata } from 'next';
import { EPOCHS_HERO } from '@/config/epochsCopy';

export const metadata: Metadata = {
  title: 'Epochs · Epoch Labs',
  description: `${EPOCHS_HERO.subtitle} ${EPOCHS_HERO.intro}`,
  alternates: { canonical: '/epochs' },
  openGraph: {
    title: 'Epochs · Epoch Labs',
    description: EPOCHS_HERO.intro,
    url: '/epochs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Epochs · Epoch Labs',
    description: EPOCHS_HERO.intro,
  },
};

export default function EpochsLayout({ children }: LayoutProps<'/epochs'>) {
  return children;
}
