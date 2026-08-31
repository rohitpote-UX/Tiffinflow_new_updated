'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Building,
  Sparkles,
  Check,
  Copy,
  LogOut,
  Loader2,
} from 'lucide-react';
import { formatCutoffDisplay } from '@/lib/utils/dates';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [defaultPref, setDefaultPref] = useState<'flexible' | 'always-veg' | 'always-non-veg'>('flexible');
  const [savingPref, setSavingPref] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setProfile(data);
          setDefaultPref(data.membership?.default_preference || 'flexible');
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCopyCode = () => {
    if (!profile?.office?.join_code) return;
    navigator.clipboard.writeText(profile.office.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdatePref = async (newPref: 'flexible' | 'always-veg' | 'always-non-veg') => {
    setDefaultPref(newPref);
    setSavingPref(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPreference: newPref }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage('✓ Dietary preference saved');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch {
      // rollback if error
    } finally {
      setSavingPref(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-surface-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-tight">Loading profile...</p>
      </div>
    );
  }

  const user = profile?.user;
  const office = profile?.office;

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 font-sans">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold font-display text-surface-900 tracking-tight">
          My Account 👤
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          Manage your dietary preferences and office information
        </p>
      </div>

      {/* User Identity Card */}
      <Card className="p-5 border border-surface-200/80 shadow-card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-extrabold font-display text-2xl flex items-center justify-center shadow-button-brand shrink-0">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-base font-bold text-surface-900">{user?.name}</h2>
          <p className="text-xs text-surface-500">{user?.email}</p>
          <p className="text-xs text-surface-500">{user?.phone}</p>
        </div>
      </Card>

      {/* Dietary Preference Card */}
      <Card className="p-5 border border-surface-200/80 shadow-card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-800">
            Default Dietary Preference
          </h3>
        </div>
        <p className="text-xs text-surface-500 leading-relaxed">
          Auto-selects your meal when you are busy and miss the daily cutoff time.
        </p>

        <div className="grid grid-cols-3 gap-2 mt-1">
          <button
            type="button"
            onClick={() => handleUpdatePref('flexible')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-tactile select-none ${
              defaultPref === 'flexible'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                : 'border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            <span className="text-lg">🔄</span>
            Flexible
          </button>
          <button
            type="button"
            onClick={() => handleUpdatePref('always-veg')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-tactile select-none ${
              defaultPref === 'always-veg'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                : 'border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            <span className="text-lg">🥦</span>
            Always Veg
          </button>
          <button
            type="button"
            onClick={() => handleUpdatePref('always-non-veg')}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-tactile select-none ${
              defaultPref === 'always-non-veg'
                ? 'border-red-600 bg-red-50 text-red-800 font-bold shadow-sm'
                : 'border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            <span className="text-lg">🍗</span>
            Always Non-Veg
          </button>
        </div>
      </Card>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Office & Join Code Card */}
      {office && (
        <Card className="p-5 border border-surface-200/80 shadow-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-800">
                Office Information
              </h3>
            </div>
            <Badge variant="brand" size="xs">
              {profile.membership?.role}
            </Badge>
          </div>

          <div className="bg-surface-50 p-4 rounded-2xl text-xs space-y-2 border border-surface-200/60">
            <div className="flex justify-between">
              <span className="text-surface-500">Office Name:</span>
              <strong className="text-surface-900">{office.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-500">Daily Cutoff:</span>
              <strong className="text-surface-900 tabular-nums">{formatCutoffDisplay(office.cutoff_time)}</strong>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-surface-200">
              <span className="text-surface-500">Team Join Code:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-700 uppercase bg-white px-2.5 py-0.5 rounded-lg border border-surface-200">
                  {office.join_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 text-surface-400 hover:text-surface-700 transition-tactile"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sign Out Button */}
      <Button
        variant="outline"
        size="md"
        className="w-full text-red-600 hover:bg-red-50 hover:border-red-200 mt-2"
        leftIcon={<LogOut className="w-4 h-4" />}
        onClick={handleLogout}
      >
        Sign Out of BiteBuddy
      </Button>
    </div>
  );
}
