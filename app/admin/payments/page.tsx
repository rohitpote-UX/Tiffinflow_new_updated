'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle2, Clock, Check, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '@/lib/utils/dates';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [markingPayment, setMarkingPayment] = useState<any>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (json.success) setPayments(json.payments);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingPayment) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: markingPayment.id,
          notes: receiptNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMarkingPayment(null);
        setReceiptNotes('');
        await loadPayments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter(
    (p) => activeFilter === 'all' || p.status === activeFilter
  );

  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCollected = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Payments Ledger 💳
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Track weekly billing settlements and verified receipts
          </p>
        </div>
      </div>

      {/* Financial Metrics Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-800 flex items-center justify-between shadow-card">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Pending Collection
            </span>
            <span className="text-3xl font-extrabold font-display tabular-nums text-white block mt-1">
              {formatCurrency(totalPending)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-800 flex items-center justify-between shadow-card">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Total Collected
            </span>
            <span className="text-3xl font-extrabold font-display tabular-nums text-white block mt-1">
              {formatCurrency(totalCollected)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-zinc-900 rounded-2xl border border-zinc-800 self-start">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
            activeFilter === 'all' ? 'bg-emerald-600 text-white shadow-button-brand' : 'text-zinc-400 hover:text-white'
          }`}
        >
          All ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
            activeFilter === 'pending' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Pending ({payments.filter((p) => p.status === 'pending').length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('paid')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
            activeFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Paid ({payments.filter((p) => p.status === 'paid').length})
        </button>
      </div>

      {/* Payments Table Container */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-card">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
            <p className="text-xs">Loading payment transactions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            <p>No transactions found in this category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Period</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {filtered.map((p) => {
                  const isPaid = p.status === 'paid';
                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{p.userName}</div>
                        <div className="text-[11px] text-zinc-500">{p.userEmail}</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400 tabular-nums">
                        {formatDisplayDate(p.period_start)} – {formatDisplayDate(p.period_end)}
                      </td>
                      <td className="px-5 py-4 font-bold text-white text-sm tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isPaid && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => {
                              setMarkingPayment(p);
                              setReceiptNotes('');
                            }}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Paid Verification Modal */}
      {markingPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleMarkPaid}
            className="bg-zinc-900 rounded-3xl p-6 max-w-sm w-full border border-zinc-800 text-white flex flex-col gap-4 shadow-float"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Verify Payment</h3>
              <button
                type="button"
                onClick={() => setMarkingPayment(null)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl text-xs space-y-1.5 text-zinc-300 border border-zinc-800">
              <p>Employee: <strong className="text-white">{markingPayment.userName}</strong></p>
              <p>Amount: <strong className="text-emerald-400 text-sm tabular-nums">{formatCurrency(markingPayment.amount)}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Receipt / Settlement Notes (Optional)
              </label>
              <input
                type="text"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="UPI Ref / Bank Transfer / Cash"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <Button size="md" variant="primary" isLoading={submitting} type="submit">
              Confirm Paid & Generate Receipt
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
