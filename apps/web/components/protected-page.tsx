'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import type { CurrentUser, Locale, Role } from '../lib/types';
import { AppShell } from './app-shell';

export function ProtectedPage({
  locale,
  title,
  roles,
  children,
}: {
  locale: Locale;
  title: string;
  roles?: Role[];
  children: (user: CurrentUser) => React.ReactNode;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    apiFetch<CurrentUser>('/auth/me')
      .then((data) => {
        if (roles?.length && !roles.includes(data.role)) {
          router.push(`/${locale}/${data.role === 'EMPLOYEE' ? 'my-assets' : 'dashboard'}`);
          return;
        }
        setUser(data);
      })
      .catch((err) => {
        setError(err.message);
        router.push(`/${locale}/login`);
      });
  }, [locale, roles, router]);

  if (error) return <div className="login-shell"><div className="error">{error}</div></div>;
  if (!user) return <div className="login-shell"><div className="notice">{dict.common.loading}</div></div>;

  return <AppShell locale={locale} user={user} title={title}>{children(user)}</AppShell>;
}
