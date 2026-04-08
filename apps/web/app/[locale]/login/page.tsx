'use client';

import { FormEvent, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';

export default function LoginPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const router = useRouter();
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    try {
      const user = await apiFetch<{ role: string; locale: 'en' | 'et' }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const nextLocale = user.locale || locale;
      router.push(`/${nextLocale}/${user.role === 'EMPLOYEE' ? 'my-assets' : 'dashboard'}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card stack">
        <div>
          <h1 style={{ marginBottom: 6 }}>{dict.login.heading}</h1>
          <div className="muted">{dict.login.helper}</div>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <form className="stack" onSubmit={submit}>
          <div>
            <label>{dict.login.email}</label>
            <input type="email" name="email" defaultValue="superadmin@company.local" required />
          </div>
          <div>
            <label>{dict.login.password}</label>
            <input type="password" name="password" defaultValue="ChangeMe123!" required />
          </div>
          <button className="primary" type="submit">{dict.common.login}</button>
        </form>
        <div className="notice">Local dev seed password: <strong>ChangeMe123!</strong></div>
      </div>
    </div>
  );
}
