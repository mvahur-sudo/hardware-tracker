'use client';

import { use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';
import { StatusBadge } from '../../../components/status-badge';

export default function DashboardPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    apiFetch('/assets/dashboard').then(setData).catch(console.error);
  }, []);

  return (
    <ProtectedPage locale={locale} title={dict.nav.dashboard} roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="stack">
          <div className="card-grid">
            <div className="card"><div className="muted">{dict.dashboard.totalAssets}</div><div className="stat">{data?.totalAssets ?? '—'}</div></div>
            <div className="card"><div className="muted">{dict.dashboard.openMaintenance}</div><div className="stat">{data?.openMaintenanceCases ?? '—'}</div></div>
            <div className="card"><div className="muted">{dict.dashboard.warrantySoon}</div><div className="stat">{data?.warrantyExpiringSoon?.length ?? '—'}</div></div>
          </div>
          <div className="two-col">
            <div className="panel stack">
              <h3>{dict.dashboard.byStatus}</h3>
              {(data?.byStatus ?? []).map((item: any) => (
                <div className="list-item row" key={item.status}><StatusBadge value={item.status} /> <strong>{item._count}</strong></div>
              ))}
            </div>
            <div className="panel stack">
              <h3>{dict.dashboard.byCategory}</h3>
              {(data?.byCategory ?? []).map((item: any) => (
                <div className="list-item row" key={item.key}><strong>{locale === 'et' ? item.nameEt : item.nameEn}</strong> <span className="muted">{item.count}</span></div>
              ))}
            </div>
          </div>
          <div className="panel stack">
            <h3>{dict.dashboard.recentActivity}</h3>
            {(data?.recentAuditEvents ?? []).map((item: any) => (
              <div className="list-item" key={item.id}>
                <strong>{item.action}</strong>
                <div className="muted">{item.actorUser ? `${item.actorUser.firstName} ${item.actorUser.lastName}` : 'System'} · {new Date(item.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
