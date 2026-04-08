import { ReactNode } from 'react';
import { locales } from '../../lib/i18n';
import { notFound } from 'next/navigation';

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as 'en' | 'et')) {
    notFound();
  }
  return children;
}
