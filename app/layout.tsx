import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export const metadata: Metadata = {
  title: 'BiteBuddy — 1-Tap Office Meal Management',
  description: 'Frictionless office meal selections, cutoff reminders, automated spend tracking, and caterer coordination.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BiteBuddy',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#16A34A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-surface-50 text-surface-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white"
      >
        <ServiceWorkerRegister />
        <OfflineBanner />
        <main className="flex-1 flex flex-col">{children}</main>
        <InstallPrompt />
      </body>
    </html>
  );
}
