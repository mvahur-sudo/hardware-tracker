'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { getDictionary } from '../lib/i18n';
import type { Asset, AssetCategory, Locale } from '../lib/types';

export function AssetForm({ locale, asset, onSaved }: { locale: Locale; asset?: Partial<Asset>; onSaved?: (asset: any) => void }) {
  const dict = getDictionary(locale);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    apiFetch<AssetCategory[]>('/asset-categories').then(setCategories).catch(console.error);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());
    const saved = await apiFetch(asset?.id ? `/assets/${asset.id}` : '/assets', {
      method: asset?.id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    });
    setMessage('Saved');
    onSaved?.(saved);
  }

  return (
    <form className="grid" onSubmit={submit}>
      <div>
        <label>Asset tag</label>
        <input name="assetTag" defaultValue={asset?.assetTag} required />
      </div>
      <div>
        <label>Serial number</label>
        <input name="serialNumber" defaultValue={asset?.serialNumber ?? ''} />
      </div>
      <div>
        <label>Category</label>
        <select name="categoryId" defaultValue={asset?.category?.id} required>
          <option value="">Select</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {locale === 'et' ? category.nameEt : category.nameEn}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Brand</label>
        <input name="brand" defaultValue={asset?.brand} required />
      </div>
      <div>
        <label>Model</label>
        <input name="model" defaultValue={asset?.model} required />
      </div>
      <div>
        <label>Status</label>
        <select name="status" defaultValue={asset?.status ?? 'IN_STOCK'}>
          {['IN_STOCK', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'LOST', 'DISPOSED'].map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      <div>
        <label>Condition</label>
        <select name="condition" defaultValue={asset?.condition ?? 'GOOD'}>
          {['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>
      <div>
        <label>Purchase date</label>
        <input type="date" name="purchaseDate" defaultValue={asset?.purchaseDate?.slice(0, 10)} />
      </div>
      <div>
        <label>Purchase price</label>
        <input type="number" step="0.01" name="purchasePrice" defaultValue={asset?.purchasePrice ?? ''} />
      </div>
      <div>
        <label>Warranty end</label>
        <input type="date" name="warrantyEndDate" defaultValue={asset?.warrantyEndDate?.slice(0, 10)} />
      </div>
      <div>
        <label>Vendor</label>
        <input name="vendor" defaultValue={asset?.vendor ?? ''} />
      </div>
      <div>
        <label>Location</label>
        <input name="location" defaultValue={asset?.location ?? ''} />
      </div>
      <div className="full">
        <label>Notes</label>
        <textarea name="notes" defaultValue={asset?.notes ?? ''} />
      </div>
      <div className="full row">
        <button className="primary" type="submit">{dict.common.save}</button>
        {message ? <span className="success">{message}</span> : null}
      </div>
    </form>
  );
}
