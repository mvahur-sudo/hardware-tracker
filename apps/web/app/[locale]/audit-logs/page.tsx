'use client';

import { use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';

export default function AuditLogsPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<{ items: any[] }>(`/audit-logs?pageSize=100&search=${encodeURIComponent(search)}`).then((data) => setRows(data.items));
  }, [search]);

  return (
    <ProtectedPage locale={locale} title={dict.auditLogs.title} roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="stack">
          <div className="panel row"><input placeholder={dict.common.search} value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 280 }} /></div>
          <div className="panel table-wrap">
            <table>
              <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th><th>Metadata</th></tr></thead>
              <tbody>
                {rows.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.action}</td><td>{row.entityType}:{row.entityId}</td><td>{row.actorUser ? `${row.actorUser.firstName} ${row.actorUser.lastName}` : 'System'}</td><td><pre>{JSON.stringify(row.metadata, null, 2)}</pre></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
