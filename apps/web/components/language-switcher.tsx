'use client';

import { useRouter, usePathname } from 'next/navigation';
import type { Locale } from '../lib/types';

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(event) => {
        const nextLocale = event.target.value as Locale;
        const segments = pathname.split('/');
        segments[1] = nextLocale;
        router.push(segments.join('/'));
      }}
      style={{ width: 120 }}
    >
      <option value="en">English</option>
      <option value="et">Eesti</option>
    </select>
  );
}
