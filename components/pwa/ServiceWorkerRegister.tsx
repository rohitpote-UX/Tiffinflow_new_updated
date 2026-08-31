'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
