'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle, Sparkles, Building, Users, ShieldCheck, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [defaultPreference, setDefaultPreference] = useState<'flexible' | 'always-veg' | 'always-non-veg'>('flexible');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFillDemo = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setName('Rohit Pote');
    setEmail(`rohit.admin${randomSuffix}@techcorp.io`);
    setPhone('+91 9876543210');
    setOfficeName('TechCorp Bangalore HQ');
    setPassword('password123');
    setDefaultPreference('flexible');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          officeName: officeName.trim(),
          role: 'ADMIN',
          defaultPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      const role = data.role || data.user?.role || data.membership?.role;
      const targetDestination = data.redirectUrl || (role === 'ADMIN' ? '/admin' : '/app');
      router.push(targetDestination);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-button-brand text-white text-2xl font-bold">
            🍱
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold font-display text-surface-900 tracking-tight">
          Create Office Workspace
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Setup a new BiteBuddy workspace for your company team
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-card border border-surface-200/80">
          {/* Employee Callout Banner */}
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-950">Are you an Employee?</p>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Join your company with an invite code or QR scan.
                </p>
              </div>
            </div>
            <Link
              href="/join"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold text-center transition-tactile shadow-sm"
            >
              Join Workplace →
            </Link>
          </div>

          {/* Quick Demo Fill */}
          <button
            type="button"
            onClick={handleFillDemo}
            className="w-full mb-5 p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between transition-tactile"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Autofill Sample Office Details</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase bg-white px-2 py-0.5 rounded-md border border-emerald-200">
              1-Click
            </span>
          </button>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin Account Details</span>
            </div>

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
              label="Office / Company Name"
              type="text"
              required
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              placeholder="Acme Corp Bangalore"
            />

            <Input
              label="Create Admin Password"
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
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Office Workspace
            </Button>
          </form>

          {/* Bottom Guidance */}
          <div className="mt-6 pt-5 border-t border-surface-100 flex flex-col items-center gap-2 text-center text-xs text-surface-500">
            <div>
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            </div>

            <div>
              Employee joining existing team?{' '}
              <Link href="/join" className="font-bold text-emerald-700 hover:text-emerald-800">
                Join with Code / QR →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
