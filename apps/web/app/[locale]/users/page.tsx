'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';

export default function UsersPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const data = await apiFetch<{ items: any[] }>('/users?pageSize=100');
    setUsers(data.items);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await apiFetch('/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(formData.entries())) });
    setMessage('User created');
    await load();
  }

  return (
    <ProtectedPage locale={locale} title={dict.users.title} roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="two-col">
          <div className="panel table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Locale</th><th>Active</th></tr></thead>
              <tbody>
                {users.map((user) => <tr key={user.id}><td>{user.firstName} {user.lastName}</td><td>{user.email}</td><td>{user.role}</td><td>{user.locale}</td><td>{String(user.isActive)}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="panel stack">
            <h3>Create user</h3>
            {message ? <div className="success">{message}</div> : null}
            <form className="grid" onSubmit={submit}>
              <div><label>First name</label><input name="firstName" required /></div>
              <div><label>Last name</label><input name="lastName" required /></div>
              <div><label>Email</label><input type="email" name="email" required /></div>
              <div><label>Password</label><input name="password" defaultValue="ChangeMe123!" required /></div>
              <div><label>Role</label><select name="role">{['IT_ADMIN', 'EMPLOYEE', 'SUPERADMIN'].map((role) => <option key={role}>{role}</option>)}</select></div>
              <div><label>Locale</label><select name="locale"><option value="en">en</option><option value="et">et</option></select></div>
              <div className="full"><button className="primary" type="submit">{dict.common.create}</button></div>
            </form>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
