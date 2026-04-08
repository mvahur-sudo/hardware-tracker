'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedPage } from '../../../../components/protected-page';
import { AssetForm } from '../../../../components/asset-form';

export default function NewAssetPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const router = useRouter();
  const { locale } = use(params);
  return (
    <ProtectedPage locale={locale} title="New asset" roles={['SUPERADMIN', 'IT_ADMIN']}>
      {() => (
        <div className="panel">
          <AssetForm locale={locale} onSaved={(asset) => router.push(`/${locale}/assets/${asset.id}`)} />
        </div>
      )}
    </ProtectedPage>
  );
}
