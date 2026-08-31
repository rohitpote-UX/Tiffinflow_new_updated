'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatCutoffDisplay } from '@/lib/utils/dates';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function JoinOfficePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || '';

  const [office, setOffice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [defaultPreference, setDefaultPreference] = useState<'flexible' | 'always-veg' | 'always-non-veg'>('flexible');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/offices/join?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOffice(data.office);
        } else {
          setError(data.error || 'Invalid or expired invite code');
        }
      })
      .catch(() => setError('Failed to load invite details'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/offices/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: code,
          name,
          email,
          phone,
          password,
          defaultPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join office');
      }

      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to join office. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-button-brand text-white text-2xl font-bold mx-auto mb-4">
          🍱
        </div>

        {office ? (
          <>
            <h2 className="text-2xl font-extrabold font-display text-surface-900 tracking-tight">
              You’re invited to join
            </h2>
            <div className="mt-2.5 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-bold text-lg shadow-subtle">
              <Building className="w-5 h-5 text-emerald-600" />
              {office.name}
            </div>
            <p className="mt-2 text-xs text-surface-500">
              Cutoff time: <span className="font-semibold text-surface-700 tabular-nums">{formatCutoffDisplay(office.cutoffTime)}</span> · Veg: ₹{office.vegPrice} · Non-Veg: ₹{office.nonVegPrice}
            </p>
          </>
        ) : (
          <h2 className="text-2xl font-bold font-display text-surface-900 tracking-tight">
            Invalid Invite Link
          </h2>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-card border border-surface-200/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {office && (
            <form className="space-y-3.5" onSubmit={handleJoin}>
              <Input
                label="Your Full Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohit Pote"
              />

              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohit@company.com"
              />

              <Input
                label="Phone Number"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />

              <Input
                label="Create Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                  Default Dietary Choice
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDefaultPreference('flexible')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-tactile select-none ${
                      defaultPreference === 'flexible'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                    }`}
                  >
                    <span className="text-base">🔄</span>
                    Flexible
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultPreference('always-veg')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-tactile select-none ${
                      defaultPreference === 'always-veg'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                    }`}
                  >
                    <span className="text-base">🥦</span>
                    Always Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultPreference('always-non-veg')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-tactile select-none ${
                      defaultPreference === 'always-non-veg'
                        ? 'border-red-600 bg-red-50 text-red-800 font-bold'
                        : 'border-surface-200 text-surface-600 hover:bg-surface-50'
                    }`}
                  >
                    <span className="text-base">🍗</span>
                    Always Non-Veg
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="md"
                variant="primary"
                className="w-full mt-3"
                isLoading={submitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Join {office.name}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-surface-500">
            Already registered?{' '}
            <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
              Log in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
