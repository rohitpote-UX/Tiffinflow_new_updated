'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Utensils, CheckCircle2, Shield, Sparkles, Building, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RootLandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          const role = data.role || data.user?.role || data.membership?.role;
          if (role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/app');
          }
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="px-6 py-4 max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-button-brand">
            🍱
          </div>
          <span className="font-bold text-xl font-display text-surface-900 tracking-tight">
            BiteBuddy
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button size="sm" variant="ghost">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" variant="primary">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center max-w-3xl mx-auto">
        {/* Calm Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold mb-6 shadow-subtle">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Office Meal Management · Zero WhatsApp Chaos</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-display text-surface-900 tracking-tight leading-[1.1] mb-5">
          Office lunch, <br className="hidden sm:inline" />
          <span className="text-emerald-700">effortless in one tap.</span>
        </h1>

        <p className="text-base sm:text-lg text-surface-500 max-w-xl mb-8 leading-relaxed">
          Replace messy group chats, lost spreadsheet orders, and manual payment tracking with a
          clean daily meal experience built for high-performance teams.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-14">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Office Account
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Sign In to Existing Office
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-3xl bg-white border border-surface-200/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mb-3 shadow-subtle">
              🥦
            </div>
            <h3 className="font-bold text-sm text-surface-900 mb-1">1-Tap Confirmation</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              Employees confirm Veg, Non-Veg or Skip in seconds with smart automatic defaults.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-surface-200/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl mb-3 shadow-subtle">
              🔔
            </div>
            <h3 className="font-bold text-sm text-surface-900 mb-1">Web Push Reminders</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              Timely, non-intrusive browser alerts before cutoff time so nobody misses lunch.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-surface-200/80 shadow-card">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center text-xl mb-3 shadow-subtle">
              📊
            </div>
            <h3 className="font-bold text-sm text-surface-900 mb-1">1-Click Caterer WhatsApp</h3>
            <p className="text-xs text-surface-500 leading-relaxed">
              Admins export exact headcounts and WhatsApp orders in one click.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-surface-200/60 text-center text-xs text-surface-400">
        BiteBuddy 2.0 · Calm Food Technology for Modern Workplaces
      </footer>
    </div>
  );
}
