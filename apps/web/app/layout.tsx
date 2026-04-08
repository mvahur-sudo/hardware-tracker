import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hardware Tracker',
  description: 'Internal hardware asset tracking platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
