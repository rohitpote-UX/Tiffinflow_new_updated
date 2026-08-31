'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if user hasn't dismissed before
      const dismissed = localStorage.getItem('bitebuddy_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('bitebuddy_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl z-40 border border-zinc-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 shadow-button">
          <span className="text-xl">🍱</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Install BiteBuddy App</p>
          <p className="text-xs text-zinc-400">1-tap lunch access from home screen</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 rounded-lg text-xs font-semibold text-white transition active:scale-95 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-zinc-400 hover:text-white rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
