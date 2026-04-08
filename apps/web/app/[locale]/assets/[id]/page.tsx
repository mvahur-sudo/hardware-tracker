'use client';

import Image from 'next/image';
import { FormEvent, use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../../components/protected-page';
import { AssetForm } from '../../../../components/asset-form';
import { apiBaseUrl, apiFetch } from '../../../../lib/api';
import type { Asset, CurrentUser, Locale } from '../../../../lib/types';
import { StatusBadge } from '../../../../components/status-badge';
import { getDictionary } from '../../../../lib/i18n';

export default function AssetDetailPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = use(params);
  const dict = getDictionary(locale);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any | null>(null);
  const [flash, setFlash] = useState('');

  async function refresh(user?: CurrentUser) {
    const assetData = await apiFetch<Asset>(`/assets/${id}`);
    const historyData = await apiFetch(`/assets/${id}/history`);
    setAsset(assetData);
    setHistory(historyData);
    if (user && user.role !== 'EMPLOYEE') {
      const userData = await apiFetch<{ items: any[] }>('/users?pageSize=100');
      setUsers(userData.items.filter((item) => item.role === 'EMPLOYEE' && item.isActive));
    }
  }

  useEffect(() => {
    apiFetch<Asset>(`/assets/${id}`).then(setAsset);
    apiFetch(`/assets/${id}/history`).then(setHistory);
  }, [id]);

  return (
    <ProtectedPage locale={locale} title={asset ? `${asset.assetTag}` : dict.assets.details} roles={['SUPERADMIN', 'IT_ADMIN', 'EMPLOYEE']}>
      {(user) => (
        <AssetDetailInner
          locale={locale}
          asset={asset}
          users={users}
          history={history}
          flash={flash}
          setFlash={setFlash}
          refresh={() => refresh(user)}
          loadUsers={async () => {
            if (user.role !== 'EMPLOYEE' && !users.length) {
              const userData = await apiFetch<{ items: any[] }>('/users?pageSize=100');
              setUsers(userData.items.filter((item) => item.role === 'EMPLOYEE' && item.isActive));
            }
          }}
          currentUser={user}
        />
      )}
    </ProtectedPage>
  );
}

function AssetDetailInner({
  locale,
  asset,
  users,
  history,
  flash,
  setFlash,
  refresh,
  loadUsers,
  currentUser,
}: {
  locale: Locale;
  asset: Asset | null;
  users: any[];
  history: any;
  flash: string;
  setFlash: (value: string) => void;
  refresh: () => Promise<void>;
  loadUsers: () => Promise<void>;
  currentUser: CurrentUser;
}) {
  const dict = getDictionary(locale);
  if (!asset) return <div className="notice">Loading...</div>;
  const currentAsset = asset;

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiFetch('/assignments/assign', {
      method: 'POST',
      body: JSON.stringify({
        assetId: currentAsset.id,
        userId: formData.get('userId'),
        expectedReturnAt: formData.get('expectedReturnAt') || undefined,
        notes: formData.get('notes') || undefined,
      }),
    });
    setFlash('Assignment created');
    await refresh();
  }

  async function returnAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeAssignment = currentAsset.assignments?.find((item: any) => !item.returnedAt);
    if (!activeAssignment) return;
    const formData = new FormData(event.currentTarget);
    await apiFetch(`/assignments/${activeAssignment.id}/return`, {
      method: 'POST',
      body: JSON.stringify({
        returnCondition: formData.get('returnCondition') || undefined,
        notes: formData.get('notes') || undefined,
      }),
    });
    setFlash('Asset returned');
    await refresh();
  }

  async function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiFetch('/maintenance', {
      method: 'POST',
      body: JSON.stringify({
        assetId: currentAsset.id,
        type: formData.get('type'),
        title: formData.get('title'),
        description: formData.get('description'),
        vendor: formData.get('vendor') || undefined,
        cost: formData.get('cost') ? Number(formData.get('cost')) : undefined,
        startedAt: formData.get('startedAt'),
        status: formData.get('status'),
      }),
    });
    setFlash('Maintenance record created');
    await refresh();
  }

  async function reportIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiFetch('/maintenance/report-issue', {
      method: 'POST',
      body: JSON.stringify({
        assetId: currentAsset.id,
        title: formData.get('title'),
        description: formData.get('description'),
      }),
    });
    setFlash('Issue reported');
    await refresh();
  }

  return (
    <div className="stack">
      {flash ? <div className="success">{flash}</div> : null}
      <div className="two-col">
        <div className="panel stack">
          <div className="row"><strong>{currentAsset.assetTag}</strong> <StatusBadge value={currentAsset.status} /> <StatusBadge value={currentAsset.condition} /></div>
          <div className="muted">{currentAsset.brand} {currentAsset.model}</div>
          <div className="row"><span>Serial: {currentAsset.serialNumber || '—'}</span><span>Location: {currentAsset.location || '—'}</span></div>
          <div className="row"><span>Assignee: {currentAsset.currentAssignee ? `${currentAsset.currentAssignee.firstName} ${currentAsset.currentAssignee.lastName}` : '—'}</span></div>
          {currentUser.role === 'EMPLOYEE' ? (
            <div className="list-item">
              <div><strong>Vendor:</strong> {currentAsset.vendor || '—'}</div>
              <div><strong>Warranty:</strong> {currentAsset.warrantyEndDate ? new Date(currentAsset.warrantyEndDate).toLocaleDateString() : '—'}</div>
              <div><strong>Notes:</strong> {currentAsset.notes || '—'}</div>
            </div>
          ) : (
            <AssetForm locale={locale} asset={currentAsset} onSaved={() => refresh()} />
          )}
        </div>
        <div className="panel stack">
          <h3>{dict.assets.qr}</h3>
          <Image className="qr" src={`${apiBaseUrl()}/api/assets/${currentAsset.id}/qr.png`} alt="QR" width={220} height={220} unoptimized />
          <a className="secondary" href={`${apiBaseUrl()}/api/assets/${currentAsset.id}/qr.png`} target="_blank">Download QR</a>
        </div>
      </div>

      {currentUser.role !== 'EMPLOYEE' ? (
        <div className="two-col">
          <div className="panel stack">
            <h3>{dict.assets.assign}</h3>
            <form className="grid" onSubmit={assign}>
              <div className="full"><button type="button" className="secondary" onClick={loadUsers}>Load employees</button></div>
              <div>
                <label>Employee</label>
                <select name="userId" required>
                  <option value="">Select</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.email})</option>)}
                </select>
              </div>
              <div>
                <label>Expected return</label>
                <input name="expectedReturnAt" type="date" />
              </div>
              <div className="full">
                <label>Notes</label>
                <textarea name="notes" />
              </div>
              <div className="full"><button className="primary" type="submit">{dict.assets.assign}</button></div>
            </form>
          </div>
          <div className="panel stack">
            <h3>{dict.assets.returnAsset}</h3>
            <form className="grid" onSubmit={returnAsset}>
              <div>
                <label>Return condition</label>
                <select name="returnCondition">
                  {['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'].map((value) => <option key={value}>{value}</option>)}
                </select>
              </div>
              <div className="full">
                <label>Notes</label>
                <textarea name="notes" />
              </div>
              <div className="full"><button className="secondary" type="submit">{dict.assets.returnAsset}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="two-col">
        <div className="panel stack">
          <h3>{dict.assets.maintenance}</h3>
          {currentUser.role !== 'EMPLOYEE' ? (
            <form className="grid" onSubmit={createMaintenance}>
              <div><label>Type</label><select name="type">{['PREVENTIVE', 'REPAIR', 'INSPECTION'].map((value) => <option key={value}>{value}</option>)}</select></div>
              <div><label>Status</label><select name="status">{['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELED'].map((value) => <option key={value}>{value}</option>)}</select></div>
              <div className="full"><label>Title</label><input name="title" required /></div>
              <div className="full"><label>Description</label><textarea name="description" required /></div>
              <div><label>Vendor</label><input name="vendor" /></div>
              <div><label>Cost</label><input type="number" step="0.01" name="cost" /></div>
              <div><label>Started</label><input type="datetime-local" name="startedAt" required /></div>
              <div className="full"><button className="primary" type="submit">Create maintenance</button></div>
            </form>
          ) : (
            <form className="grid" onSubmit={reportIssue}>
              <div className="full"><label>Issue title</label><input name="title" required /></div>
              <div className="full"><label>Description</label><textarea name="description" required /></div>
              <div className="full"><button className="primary" type="submit">{dict.assets.reportIssue}</button></div>
            </form>
          )}
          {(currentAsset.maintenance ?? []).map((item: any) => (
            <div className="list-item" key={item.id}><div className="row"><strong>{item.title}</strong><StatusBadge value={item.status} /></div><div className="muted">{item.type} · {item.vendor || 'Internal'} · {new Date(item.startedAt).toLocaleString()}</div><div>{item.description}</div></div>
          ))}
        </div>
        <div className="panel stack">
          <h3>{dict.assets.history}</h3>
          <div className="list">
            {(history?.assignments ?? []).map((item: any) => <div key={item.id} className="list-item"><strong>Assignment</strong><div className="muted">{item.user.firstName} {item.user.lastName} · {new Date(item.assignedAt).toLocaleString()}</div></div>)}
            {(history?.maintenance ?? []).map((item: any) => <div key={item.id} className="list-item"><strong>Maintenance</strong><div className="muted">{item.title} · {item.status}</div></div>)}
            {(history?.audit ?? []).map((item: any) => <div key={item.id} className="list-item"><strong>{item.action}</strong><div className="muted">{new Date(item.createdAt).toLocaleString()}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
