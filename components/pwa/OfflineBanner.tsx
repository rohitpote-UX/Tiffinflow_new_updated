'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-zinc-900 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-50 animate-pulse">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>You are currently offline. Showing cached meal information.</span>
    </div>
  );
}
