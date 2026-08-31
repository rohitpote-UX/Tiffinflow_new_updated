'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCcw,
  Copy,
  Check,
  Building,
  TrendingUp,
  X,
  Loader2,
} from 'lucide-react';
import { formatCurrency, formatDisplayDate, formatFullDate } from '@/lib/utils/dates';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [catererText, setCatererText] = useState('');
  const [copiedCaterer, setCopiedCaterer] = useState(false);

  // Modal States
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [newCutoff, setNewCutoff] = useState('19:30');
  const [cancelReason, setCancelReason] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }

      const catRes = await fetch('/api/reports/caterer');
      const catJson = await catRes.json();
      if (catJson.success) {
        setCatererText(catJson.whatsAppText);
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 15000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleRemindPending = async () => {
    if (reminding || !data?.targetDate) return;
    setReminding(true);
    try {
      const res = await fetch('/api/admin/remind-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId: data.office.id,
          date: data.targetDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage(`🔔 ${json.message}`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setReminding(false);
    }
  };

  const handleFinalizeOrder = async () => {
    if (finalizing || !data?.targetDate) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/admin/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: data.targetDate }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage(`✓ ${json.message}`);
        setTimeout(() => setToastMessage(''), 4000);
        await loadDashboard();
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setFinalizing(false);
    }
  };

  const handleExtendCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      const res = await fetch('/api/admin/override-cutoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId: data.office.id,
          newCutoffTime: newCutoff,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowExtendModal(false);
        setToastMessage(`⏰ ${json.message}`);
        setTimeout(() => setToastMessage(''), 4000);
        await loadDashboard();
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleEmergencyCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      const res = await fetch('/api/admin/cancel-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId: data.office.id,
          date: data.targetDate,
          reason: cancelReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCancelModal(false);
        setToastMessage(`⚠️ ${json.message}`);
        setTimeout(() => setToastMessage(''), 4000);
        await loadDashboard();
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCopyCaterer = () => {
    navigator.clipboard.writeText(catererText);
    setCopiedCaterer(true);
    setTimeout(() => setCopiedCaterer(false), 2500);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-tight">Aggregating live headcount...</p>
      </div>
    );
  }

  const stats = data?.stats;
  const office = data?.office;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-button-brand animate-in fade-in">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Live Status & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Operations Dashboard 👑
            </h1>
            {data?.isFinalized && (
              <Badge variant="success" size="xs">
                Finalized
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Managing lunch orders for <strong className="text-zinc-200">{formatFullDate(data?.targetDate)}</strong>
          </p>
        </div>

        {/* Operational Action Group */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-300 border border-zinc-800 hover:bg-zinc-850 hover:text-white"
            onClick={() => setShowExtendModal(true)}
          >
            Extend Cutoff
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 border border-red-950/60 hover:bg-red-950/40"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Meal
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={finalizing || data?.isFinalized}
            isLoading={finalizing}
            onClick={handleFinalizeOrder}
          >
            {data?.isFinalized ? '✓ Order Finalized' : 'Finalize Order'}
          </Button>
        </div>
      </div>

      {/* Metric Cards Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Orders Metric */}
        <div className="col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-900/80 p-5 sm:p-6 rounded-3xl border border-zinc-800 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Response Rate
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              {stats?.responseRate}% Completed
            </span>
          </div>
          <div className="my-3">
            <span className="text-4xl font-extrabold font-display tabular-nums text-white">
              {stats?.respondedCount}{' '}
              <span className="text-xl text-zinc-500 font-normal">/ {stats?.totalMembers}</span>
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.responseRate || 0}%` }}
            />
          </div>
        </div>

        {/* Veg Headcount */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Veg Meals</span>
            <span className="text-base">🥦</span>
          </div>
          <span className="text-3xl font-extrabold font-display tabular-nums text-emerald-400 mt-2">
            {stats?.vegCount}
          </span>
          <span className="text-[11px] text-zinc-500 tabular-nums">₹{office?.vegPrice} / meal</span>
        </div>

        {/* Non-Veg Headcount */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Non-Veg</span>
            <span className="text-base">🍗</span>
          </div>
          <span className="text-3xl font-extrabold font-display tabular-nums text-red-400 mt-2">
            {stats?.nonVegCount}
          </span>
          <span className="text-[11px] text-zinc-500 tabular-nums">₹{office?.nonVegPrice} / meal</span>
        </div>

        {/* Pending Action Count */}
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <span>Pending</span>
            <span className="text-base">⏳</span>
          </div>
          <span className="text-3xl font-extrabold font-display tabular-nums text-amber-400 mt-2">
            {stats?.pendingCount}
          </span>
          <span className="text-[11px] text-zinc-500">Awaiting response</span>
        </div>
      </div>

      {/* Action Required: Remind Pending Banner */}
      {stats?.pendingCount > 0 && (
        <div className="bg-amber-950/25 border border-amber-900/50 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                Action Required: {stats.pendingCount} employee(s) haven’t responded
              </h3>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Send targeted Web Push reminders to pending members before the {office?.cutoffTime} cutoff.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="accent"
            isLoading={reminding}
            leftIcon={<Bell className="w-4 h-4" />}
            onClick={handleRemindPending}
          >
            Remind Pending Users
          </Button>
        </div>
      )}

      {/* Send to Caterer WhatsApp Card */}
      <div className="bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-800 flex flex-col gap-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Send Order to Caterer (WhatsApp Formatted)</span>
          </div>
          <Button
            size="xs"
            variant="ghost"
            className="text-zinc-200 border border-zinc-750 bg-zinc-800 hover:bg-zinc-700"
            leftIcon={copiedCaterer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyCaterer}
          >
            {copiedCaterer ? 'Copied to Clipboard!' : 'Copy Summary'}
          </Button>
        </div>

        <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-300 text-xs font-mono whitespace-pre-wrap border border-zinc-800/80 leading-relaxed overflow-x-auto">
          {catererText}
        </pre>
      </div>

      {/* Extend Cutoff Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleExtendCutoff}
            className="bg-zinc-900 rounded-3xl p-6 max-w-sm w-full border border-zinc-800 text-white flex flex-col gap-4 shadow-float"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Extend Lunch Cutoff</h3>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Extending cutoff will broadcast a notification to all pending team members.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                New Cutoff Time (24h)
              </label>
              <input
                type="text"
                required
                value={newCutoff}
                onChange={(e) => setNewCutoff(e.target.value)}
                placeholder="19:30"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Button size="md" variant="primary" isLoading={modalSubmitting} type="submit">
              Confirm & Broadcast
            </Button>
          </form>
        </div>
      )}

      {/* Emergency Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleEmergencyCancel}
            className="bg-zinc-900 rounded-3xl p-6 max-w-sm w-full border border-zinc-800 text-white flex flex-col gap-4 shadow-float"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-red-400">Emergency Cancel Lunch</h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will cancel all confirmed meals for tomorrow and notify all office members.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Reason for cancellation
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Office event / Holiday / Caterer unavailable"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <Button size="md" variant="danger" isLoading={modalSubmitting} type="submit">
              Cancel Lunch & Alert Team
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
