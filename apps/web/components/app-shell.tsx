'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getDictionary } from '../lib/i18n';
import type { CurrentUser, Locale } from '../lib/types';
import { LanguageSwitcher } from './language-switcher';
import { apiFetch } from '../lib/api';

export function AppShell({ locale, user, children, title }: { locale: Locale; user: CurrentUser; children: React.ReactNode; title: string }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    { href: `/${locale}/assets`, label: dict.nav.assets, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    { href: `/${locale}/users`, label: dict.nav.users, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    { href: `/${locale}/reports`, label: dict.nav.reports, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    { href: `/${locale}/audit-logs`, label: dict.nav.auditLogs, roles: ['SUPERADMIN', 'IT_ADMIN'] },
    { href: `/${locale}/my-assets`, label: dict.nav.myAssets, roles: ['EMPLOYEE'] },
    { href: `/${locale}/profile`, label: dict.nav.profile, roles: ['SUPERADMIN', 'IT_ADMIN', 'EMPLOYEE'] },
    { href: `/${locale}/scan`, label: dict.nav.scan, roles: ['SUPERADMIN', 'IT_ADMIN', 'EMPLOYEE'] },
  ];

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <h1>{dict.app.title}</h1>
          <div className="muted" style={{ color: 'rgba(255,255,255,0.65)' }}>{dict.app.subtitle}</div>
        </div>
        <nav>
          {links.filter((link) => link.roles.includes(user.role)).map((link) => (
            <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
              {link.label}
            </Link>
          ))}
          <button type="button" onClick={logout}>{dict.nav.logout}</button>
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <div className="muted">{user.firstName} {user.lastName} · {user.role}</div>
          </div>
          <LanguageSwitcher locale={locale} />
        </div>
        {children}
      </main>
    </div>
  );
}
