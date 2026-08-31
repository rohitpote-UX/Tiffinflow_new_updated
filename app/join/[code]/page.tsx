'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { formatCutoffDisplay } from '@/lib/utils/dates';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function JoinOfficeDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.code as string) || '';
  const code = decodeURIComponent(rawCode).trim().toUpperCase();

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
    if (!code) {
      setLoading(false);
      setError('Missing invite code');
      return;
    }

    fetch(`/api/offices/join?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOffice(data.office);
        } else {
          setError(data.error || 'We couldn’t find that workplace. Please check the invite link.');
        }
      })
      .catch(() => setError('Failed to load invite details'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleFillDemo = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setName('Dev Employee');
    setEmail(`dev.employee${randomSuffix}@techcorp.io`);
    setPhone('+91 9988776655');
    setPassword('password123');
    setDefaultPreference('flexible');
  };

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
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
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
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-button-brand text-white text-2xl font-bold">
            🍱
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold font-display text-surface-900 tracking-tight">
          Join Your Workplace
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Complete your employee profile to join your office
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-card border border-surface-200/80">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {office ? (
            <div>
              {/* Verified Workplace Banner (Company Name Locked) */}
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 mb-5 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    ✓ Verified Workplace
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                    {code}
                  </span>
                </div>
                <div className="text-lg font-bold text-surface-900 font-display flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{office.name}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-surface-600">
                  <span>Cutoff: <strong>{formatCutoffDisplay(office.cutoffTime)}</strong></span>
                  <span>·</span>
                  <span>Role: <strong className="text-emerald-700">Employee</strong></span>
                </div>
              </div>

              {/* Quick Fill Employee Details */}
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full mb-4 p-2 rounded-xl bg-surface-100 hover:bg-surface-200/70 text-surface-800 text-xs font-semibold flex items-center justify-between transition-tactile"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Autofill Sample Profile</span>
                </div>
                <span className="text-[10px] font-bold text-surface-600 uppercase bg-white px-2 py-0.5 rounded-md border border-surface-200">
                  Demo
                </span>
              </button>

              <form className="space-y-3.5" onSubmit={handleJoin}>
                <Input
                  label="Your Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dev Employee"
                />

                <Input
                  label="Work Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev.employee@company.com"
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
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                    Default Dietary Preference
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
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-surface-500 mb-4">
                The invite code you used is invalid or no longer active.
              </p>
              <Link href="/join">
                <Button size="sm" variant="primary">
                  Enter Join Code Manually
                </Button>
              </Link>
            </div>
          )}

          {/* Bottom Guidance */}
          <div className="mt-6 pt-5 border-t border-surface-100 flex flex-col items-center gap-2 text-center text-xs text-surface-500">
            <div>
              Already registered?{' '}
              <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
                Sign in to your account
              </Link>
            </div>

            <div>
              Need to create a new office workspace?{' '}
              <Link href="/signup" className="font-bold text-surface-700 hover:text-surface-900">
                Create Workspace (Admin) →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
