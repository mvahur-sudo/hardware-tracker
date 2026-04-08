'use client';

import { use, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useRouter } from 'next/navigation';
import { ProtectedPage } from '../../../components/protected-page';
import { apiFetch } from '../../../lib/api';

export default function ScanPage({ params }: { params: Promise<{ locale: 'en' | 'et' }> }) {
  const { locale } = use(params);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function startScan() {
    setMessage('Starting camera...');
    const reader = new BrowserQRCodeReader();
    const devices = await BrowserQRCodeReader.listVideoInputDevices();
    const deviceId = devices[0]?.deviceId;
    if (!deviceId || !videoRef.current) {
      setMessage('No camera available');
      return;
    }

    const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (result) => {
      if (result) {
        setMessage(`Scanned: ${result.getText()}`);
        const asset = await apiFetch<{ id: string }>(`/assets/lookup/qr?value=${encodeURIComponent(result.getText())}`);
        controls.stop();
        router.push(`/${locale}/assets/${asset.id}`);
      }
    });
  }

  return (
    <ProtectedPage locale={locale} title="Scan QR">
      {() => (
        <div className="panel stack">
          <button className="primary" onClick={startScan}>Start QR scan</button>
          {message ? <div className="notice">{message}</div> : null}
          <video ref={videoRef} style={{ width: '100%', maxWidth: 640, borderRadius: 16, background: '#0f172a' }} />
        </div>
      )}
    </ProtectedPage>
  );
}
