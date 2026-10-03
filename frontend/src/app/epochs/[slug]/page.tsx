import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EPOCH_COPY, EPOCH_SHARE } from '@/config/epochsCopy';
import { ShareRedirect } from './ShareRedirect';

// Share URL for one epoch (/epochs/first-burn). Crawlers read this page's metadata and OG image;
// people are sent on to the card at /epochs#first-burn. A #fragment alone never reaches a crawler.

export function generateStaticParams() {
  return EPOCH_SHARE.map((e) => ({ slug: e.anchor }));
}

export const dynamicParams = false;

const find = (slug: string) => EPOCH_SHARE.find((e) => e.anchor === slug);

export async function generateMetadata({ params }: PageProps<'/epochs/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const epoch = find(slug);
  if (!epoch) return {};
  const title = `Epoch ${epoch.numeral}: ${epoch.name} · Epoch Labs`;
  const description = EPOCH_COPY[epoch.key].oneLine;
  return {
    title,
    description,
    alternates: { canonical: `/epochs#${epoch.anchor}` },
    openGraph: { title, description, url: `/epochs/${epoch.anchor}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function EpochSharePage({ params }: PageProps<'/epochs/[slug]'>) {
  const { slug } = await params;
  const epoch = find(slug);
  if (!epoch) notFound();
  return <ShareRedirect anchor={epoch.anchor} label={`Epoch ${epoch.numeral}: ${epoch.name}`} />;
}
