'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, AlertCircle, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickLogin = (role: 'admin' | 'employee') => {
    if (role === 'admin') {
      setEmail('admin@bitebuddy.app');
      setPassword('password');
      executeLogin('admin@bitebuddy.app', 'password');
    } else {
      setEmail('employee@bitebuddy.app');
      setPassword('password');
      executeLogin('employee@bitebuddy.app', 'password');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-button-brand text-white text-2xl font-bold">
            🍱
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold font-display text-surface-900 tracking-tight">
          Welcome to BiteBuddy
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Sign in to manage or confirm your daily office lunch
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-card border border-surface-200/80">
          {/* Quick 1-Tap Demo Logins */}
          <div className="mb-5 space-y-2">
            <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider text-center mb-1">
              ⚡ Instant 1-Tap Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="p-2.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-950 text-xs font-semibold flex flex-col items-center gap-1 transition-tactile"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Admin Mode</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-normal">
                  Live counts & orders
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('employee')}
                disabled={loading}
                className="p-2.5 rounded-2xl bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200 text-amber-950 text-xs font-semibold flex flex-col items-center gap-1 transition-tactile"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Employee Mode</span>
                </div>
                <span className="text-[10px] text-amber-700 font-normal">
                  1-tap meal select
                </span>
              </button>
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-surface-400 font-medium tracking-wider">
                Or sign in with email
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rohit@company.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="md"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Clear Bottom Onboarding Paths */}
          <div className="mt-6 pt-5 border-t border-surface-100 flex flex-col items-center gap-2.5 text-center text-xs text-surface-500">
            <div>
              New employee joining a team?{' '}
              <Link href="/join" className="font-bold text-emerald-700 hover:text-emerald-800">
                Join with Code / QR →
              </Link>
            </div>

            <div>
              Setting up a new office?{' '}
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
