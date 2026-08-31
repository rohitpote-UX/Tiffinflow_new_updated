'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-button-brand text-white text-2xl font-bold">
            🍱
          </div>
        </Link>
        <h2 className="text-3xl font-extrabold font-display text-surface-900 tracking-tight">
          Enter Reset Code
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Enter the 6-digit code and choose a new password
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

          {success ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-subtle">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-surface-900">Password Updated!</h3>
              <p className="text-xs text-surface-500">Redirecting to sign in...</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="6-Digit Reset Code"
                type="text"
                required
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                className="font-mono text-center tracking-widest text-lg font-bold"
              />

              <Input
                label="New Password (min 6 chars)"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Button
                type="submit"
                size="md"
                variant="primary"
                className="w-full mt-2"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Update Password & Sign In
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-surface-500 flex items-center justify-center gap-1">
            <Link href="/login" className="font-semibold text-surface-600 hover:text-surface-900 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
