'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';
import { getDictionary } from '../../../lib/i18n';

export default function ProfilePage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const dict = getDictionary(locale);
  const [profile, setProfile] = useState<any | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch('/me').then(setProfile);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    await apiFetch('/me', { method: 'PATCH', body: JSON.stringify(payload) });
    setMessage('Profile updated');
    setProfile(await apiFetch('/me'));
  }

  return (
    <ProtectedPage locale={locale} title={dict.profile.title}>
      {() => (
        <div className="panel stack">
          {message ? <div className="success">{message}</div> : null}
          {profile ? (
            <form className="grid" onSubmit={submit}>
              <div><label>First name</label><input name="firstName" defaultValue={profile.firstName} /></div>
              <div><label>Last name</label><input name="lastName" defaultValue={profile.lastName} /></div>
              <div><label>Email</label><input defaultValue={profile.email} disabled /></div>
              <div><label>Locale</label><select name="locale" defaultValue={profile.locale}><option value="en">en</option><option value="et">et</option></select></div>
              <div className="full"><label>New password</label><input name="password" type="password" /></div>
              <div className="full"><button className="primary" type="submit">{dict.common.save}</button></div>
            </form>
          ) : <div className="notice">Loading...</div>}
        </div>
      )}
    </ProtectedPage>
  );
}
