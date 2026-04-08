'use client';

import { use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiBaseUrl, apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';

const reportKeys = [
  'inventory-by-category',
  'inventory-by-status',
  'assigned-by-employee',
  'warranty-expiring',
  'assets-in-maintenance',
  'maintenance-costs',
  'retired-disposed',
  'recent-activity',
];

export default function ReportsPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [selected, setSelected] = useState(reportKeys[0]);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<any[]>(`/reports/${selected}`).then(setRows);
  }, [selected]);

  return (
    <ProtectedPage locale={locale} title={dict.reports.title} roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="stack">
          <div className="toolbar">
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              {reportKeys.map((key) => <option key={key}>{key}</option>)}
            </select>
            <div className="row">
              <a className="secondary" href={`${apiBaseUrl()}/api/reports/${selected}/export/csv`}>{dict.common.exportCsv}</a>
              <a className="secondary" href={`${apiBaseUrl()}/api/reports/${selected}/export/xlsx`}>{dict.common.exportXlsx}</a>
              <a className="secondary" href={`${apiBaseUrl()}/api/reports/${selected}/export/pdf`}>{dict.common.exportPdf}</a>
            </div>
          </div>
          <div className="panel"><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(rows, null, 2)}</pre></div>
        </div>
      )}
    </ProtectedPage>
  );
}
