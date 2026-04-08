'use client';

import Link from 'next/link';
import { ChangeEvent, use, useEffect, useMemo, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiBaseUrl, apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';
import type { Asset, AssetCategory } from '../../../lib/types';
import { StatusBadge } from '../../../components/status-badge';

export default function AssetsPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [preview, setPreview] = useState<any | null>(null);
  const query = useMemo(() => new URLSearchParams({ ...(search ? { search } : {}), ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}), pageSize: '100' }).toString(), [search, status, categoryId]);

  useEffect(() => {
    apiFetch<{ items: Asset[] }>('/assets?' + query).then((data) => setAssets(data.items));
  }, [query]);

  useEffect(() => {
    apiFetch<AssetCategory[]>('/asset-categories').then(setCategories);
  }, []);

  async function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${apiBaseUrl()}/api/imports/assets/preview`, { method: 'POST', body: form, credentials: 'include' });
    setPreview(await response.json());
  }

  async function commitImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await fetch(`${apiBaseUrl()}/api/imports/assets/commit`, { method: 'POST', body: form, credentials: 'include' });
    const result = await apiFetch<{ items: Asset[] }>('/assets?pageSize=100');
    setAssets(result.items);
  }

  return (
    <ProtectedPage locale={locale} title={dict.assets.title} roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="stack">
          <div className="toolbar">
            <div className="row">
              <input placeholder={dict.common.search} value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 280 }} />
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {['IN_STOCK', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST', 'DISPOSED'].map((value) => <option key={value}>{value}</option>)}
              </select>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{locale === 'et' ? category.nameEt : category.nameEn}</option>)}
              </select>
            </div>
            <div className="row">
              <Link className="secondary" href={`/${locale}/assets/new`}>{dict.assets.newAsset}</Link>
              <a className="secondary" href={`${apiBaseUrl()}/api/imports/assets/template?format=csv`}>{dict.assets.importTemplate} CSV</a>
              <a className="secondary" href={`${apiBaseUrl()}/api/exports/assets?format=csv`}>{dict.common.exportCsv}</a>
              <a className="secondary" href={`${apiBaseUrl()}/api/exports/assets?format=xlsx`}>{dict.common.exportXlsx}</a>
              <a className="secondary" href={`${apiBaseUrl()}/api/exports/assets?format=pdf`}>{dict.common.exportPdf}</a>
            </div>
          </div>
          <div className="panel stack">
            <div className="row">
              <label>{dict.common.importPreview}<input type="file" accept=".csv,.xlsx" onChange={previewImport} /></label>
              <label>{dict.common.commitImport}<input type="file" accept=".csv,.xlsx" onChange={commitImport} /></label>
            </div>
            {preview ? <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(preview, null, 2)}</pre> : null}
          </div>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset tag</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Brand / Model</th>
                  <th>Assignee</th>
                  <th>Warranty</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset: Asset) => (
                  <tr key={asset.id}>
                    <td><Link href={`/${locale}/assets/${asset.id}`}>{asset.assetTag}</Link></td>
                    <td>{locale === 'et' ? asset.category.nameEt : asset.category.nameEn}</td>
                    <td><StatusBadge value={asset.status} /></td>
                    <td>{asset.brand} {asset.model}</td>
                    <td>{asset.currentAssignee ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}` : '—'}</td>
                    <td>{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
