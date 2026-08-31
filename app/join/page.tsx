'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Building,
  CheckCircle2,
  AlertCircle,
  QrCode,
  KeyRound,
  Camera,
  RefreshCw,
  Sparkles,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatCutoffDisplay } from '@/lib/utils/dates';

function JoinWorkplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  // Mode: 'code' | 'camera'
  const [activeTab, setActiveTab] = useState<'code' | 'camera'>('code');

  // Code state
  const [joinCodeInput, setJoinCodeInput] = useState(initialCode);
  const [validatingCode, setValidatingCode] = useState(false);
  const [verifiedOffice, setVerifiedOffice] = useState<any>(null);
  const [error, setError] = useState('');

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  // Employee Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [defaultPreference, setDefaultPreference] = useState<'flexible' | 'always-veg' | 'always-non-veg'>('flexible');
  const [submitting, setSubmitting] = useState(false);

  // Auto-validate if code present in URL
  useEffect(() => {
    if (initialCode) {
      validateJoinCode(initialCode);
    }
  }, [initialCode]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const validateJoinCode = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a join code');
      return;
    }

    setError('');
    setValidatingCode(true);

    try {
      const res = await fetch(`/api/offices/join?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'We couldn’t find that workplace. Please check the code and try again.');
      }

      setVerifiedOffice(data.office);
      setJoinCodeInput(trimmed);
      stopCamera();
    } catch (err: any) {
      setError(err.message || 'Failed to verify workplace code');
      setVerifiedOffice(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleFillDemoCode = () => {
    setJoinCodeInput('BITE-HQ');
    validateJoinCode('BITE-HQ');
  };

  const handleFillEmployeeDemo = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setName('Ananya Sharma');
    setEmail(`ananya.emp${randomSuffix}@techcorp.io`);
    setPhone('+91 9811223344');
    setPassword('password123');
    setDefaultPreference('always-veg');
  };

  // Camera QR Scanner
  const startCamera = async () => {
    setCameraError('');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access is unavailable. Please enter your Join Code manually below.');
      setCameraActive(false);
      setActiveTab('code');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startScanningLoop = () => {
    if (!('BarcodeDetector' in window)) return;

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const interval = setInterval(async () => {
        if (!videoRef.current || !streamRef.current) {
          clearInterval(interval);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            clearInterval(interval);
            stopCamera();

            // Extract code from URL (e.g., https://.../join/BITE-7K4P or raw code)
            let extractedCode = rawValue;
            if (rawValue.includes('/join/')) {
              extractedCode = rawValue.split('/join/')[1].split('?')[0];
            }
            validateJoinCode(extractedCode);
          }
        } catch {
          // ignore frame processing errors
        }
      }, 500);
    } catch {
      // Fallback
    }
  };

  const handleTabSwitch = (tab: 'code' | 'camera') => {
    setActiveTab(tab);
    setError('');
    setCameraError('');
    if (tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/offices/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: joinCodeInput,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          defaultPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join workplace');
      }

      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
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
          Join Your Workplace
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Connect to your office with an invite code or QR scan
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-card border border-surface-200/80">
          {/* Top Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {cameraError && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {!verifiedOffice ? (
            /* STEP 1: Code Entry or QR Scan */
            <div>
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-100 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('code')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-tactile ${
                    activeTab === 'code'
                      ? 'bg-white text-surface-900 shadow-subtle'
                      : 'text-surface-500 hover:text-surface-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enter Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('camera')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-tactile ${
                    activeTab === 'camera'
                      ? 'bg-white text-surface-900 shadow-subtle'
                      : 'text-surface-500 hover:text-surface-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan QR Code</span>
                </button>
              </div>

              {activeTab === 'code' ? (
                /* Mode A: Enter Join Code */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    validateJoinCode(joinCodeInput);
                  }}
                  className="space-y-4"
                >
                  {/* Quick Demo Code Fill */}
                  <button
                    type="button"
                    onClick={handleFillDemoCode}
                    className="w-full p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between transition-tactile"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Try Sample Code (BITE-HQ)</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      Demo
                    </span>
                  </button>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                      Workplace Join Code
                    </label>
                    <input
                      type="text"
                      required
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. BITE-7K4P"
                      className="w-full px-4 py-3.5 rounded-2xl bg-surface-50 border border-surface-200 text-surface-900 font-mono text-center text-lg font-extrabold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-tactile"
                    />
                    <p className="mt-1.5 text-[11px] text-surface-400 text-center">
                      Ask your office admin for the 8-character invite code
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="md"
                    variant="primary"
                    className="w-full mt-2"
                    isLoading={validatingCode}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Verify Workplace Code
                  </Button>
                </form>
              ) : (
                /* Mode B: Scan QR Code Viewfinder */
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative w-full aspect-square max-w-[280px] bg-black rounded-3xl overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center shadow-card">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target Box Overlay */}
                    <div className="absolute inset-8 border-2 border-dashed border-white/80 rounded-2xl pointer-events-none animate-pulse" />
                    {!cameraActive && (
                      <div className="absolute inset-0 bg-surface-900/90 flex flex-col items-center justify-center p-4 text-white">
                        <Camera className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold">Starting camera...</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-surface-500 max-w-xs leading-relaxed">
                    Point your camera at the BiteBuddy QR code on your office lunch poster or admin’s screen.
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTabSwitch('code')}
                  >
                    Enter Code Manually Instead
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Workplace Verified — Employee Profile Completion */
            <div>
              {/* Verified Workplace Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 mb-5 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    ✓ Verified Workplace
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerifiedOffice(null)}
                    className="text-[11px] font-semibold text-emerald-800 hover:underline flex items-center gap-0.5"
                  >
                    <ChevronLeft className="w-3 h-3" /> Change
                  </button>
                </div>
                <div className="text-lg font-bold text-surface-900 font-display flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{verifiedOffice.name}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-surface-600">
                  <span>Cutoff: <strong>{formatCutoffDisplay(verifiedOffice.cutoffTime)}</strong></span>
                  <span>·</span>
                  <span>Role: <strong className="text-emerald-700">Employee</strong></span>
                </div>
              </div>

              {/* Quick Fill Employee Details */}
              <button
                type="button"
                onClick={handleFillEmployeeDemo}
                className="w-full mb-4 p-2 rounded-xl bg-surface-100 hover:bg-surface-200/70 text-surface-800 text-xs font-semibold flex items-center justify-between transition-tactile"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Autofill Employee Profile</span>
                </div>
                <span className="text-[10px] font-bold text-surface-600 uppercase bg-white px-2 py-0.5 rounded-md border border-surface-200">
                  Demo
                </span>
              </button>

              <form className="space-y-3.5" onSubmit={handleJoinSubmit}>
                <Input
                  label="Your Full Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ananya Sharma"
                />

                <Input
                  label="Work Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@company.com"
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
                    Dietary Preference
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
                  Join {verifiedOffice.name}
                </Button>
              </form>
            </div>
          )}

          {/* Bottom Clear Routing Guidance */}
          <div className="mt-6 pt-5 border-t border-surface-100 flex flex-col items-center gap-2 text-center text-xs text-surface-500">
            <div>
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            </div>

            <div>
              Setting up a new office for your team?{' '}
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

export default function JoinWorkplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-50 flex items-center justify-center font-sans">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <JoinWorkplaceContent />
    </Suspense>
  );
}
