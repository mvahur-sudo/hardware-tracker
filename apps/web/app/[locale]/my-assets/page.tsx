'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';
import { StatusBadge } from '../../../components/status-badge';

export default function MyAssetsPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<{ items: any[] }>('/assets?pageSize=100').then((data) => setAssets(data.items));
  }, []);

  return (
    <ProtectedPage locale={locale} title={dict.myAssets.title} roles={['EMPLOYEE']}>
      {() => (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Asset tag</th><th>Category</th><th>Status</th><th>Model</th><th>Warranty</th></tr></thead>
            <tbody>
              {assets.map((asset) => <tr key={asset.id}><td><Link href={`/${locale}/assets/${asset.id}`}>{asset.assetTag}</Link></td><td>{locale === 'et' ? asset.category.nameEt : asset.category.nameEn}</td><td><StatusBadge value={asset.status} /></td><td>{asset.brand} {asset.model}</td><td>{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedPage>
  );
}
