'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';

export function PushPermissionBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    if (Notification.permission === 'granted') {
      setIsSubscribed(true);
      return;
    }

    if (Notification.permission === 'default') {
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('bitebuddy_push_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription && vapidPublicKey) {
        // Convert base64 url to Uint8Array
        const padding = '='.repeat((4 - (vapidPublicKey.length % 4)) % 4);
        const base64 = (vapidPublicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray,
        });
      }

      if (subscription) {
        const subJson = subscription.toJSON();
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
            userAgent: navigator.userAgent,
          }),
        });
      }

      setIsSubscribed(true);
      setIsVisible(false);
    } catch (e) {
      console.warn('Failed to subscribe push notification:', e);
      setIsVisible(false);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('bitebuddy_push_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 py-3 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-100">Never miss cutoff</p>
            <p className="text-sm font-medium">Enable daily lunch reminders before 7 PM</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="px-3.5 py-1.5 bg-white text-brand-600 hover:bg-brand-50 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {isSubscribing ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-white/80 hover:text-white rounded-md transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
