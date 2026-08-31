'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, Receipt, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate } from '@/lib/utils/dates';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function EmployeePaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    fetch('/api/payments')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json);
      })
      .catch((e) => console.warn('Failed to load payments:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-surface-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-tight">Loading payment ledger...</p>
      </div>
    );
  }

  const currentBill = data?.currentWeekBill;
  const payments = data?.payments || [];

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 font-sans">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold font-display text-surface-900 tracking-tight">
          Payments & Billing 💳
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          Weekly bill settlement and digital receipts
        </p>
      </div>

      {/* Current Week Running Bill Card */}
      {currentBill && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-5 sm:p-6 text-white shadow-button-brand relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
              Current Week Bill
            </span>
            <span className="text-xs text-emerald-100 bg-white/15 px-2.5 py-0.5 rounded-full font-medium">
              {formatDisplayDate(currentBill.periodStart)} – {formatDisplayDate(currentBill.periodEnd)}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-extrabold font-display tabular-nums">
              {formatCurrency(currentBill.totalAmount)}
            </span>
            <span className="text-xs text-emerald-100">accrued so far</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <span className="text-[10px] text-emerald-100 uppercase block font-bold">Veg Days</span>
              <span className="text-sm font-bold tabular-nums">{currentBill.vegDays}</span>
            </div>
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <span className="text-[10px] text-emerald-100 uppercase block font-bold">Non-Veg Days</span>
              <span className="text-sm font-bold tabular-nums">{currentBill.nonVegDays}</span>
            </div>
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <span className="text-[10px] text-emerald-100 uppercase block font-bold">Skipped</span>
              <span className="text-sm font-bold tabular-nums">{currentBill.skippedDays}</span>
            </div>
          </div>
        </div>
      )}

      {/* Settlement History Section */}
      <Card className="p-5 border border-surface-200/80 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">
          Settlement History
        </h3>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-surface-400 text-xs">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No previous weekly bills generated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {payments.map((p: any) => {
              const isPaid = p.status === 'paid';
              return (
                <div
                  key={p.id}
                  className="py-3.5 flex items-center justify-between text-xs hover:bg-surface-50 rounded-2xl px-2 -mx-2 transition-tactile"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-surface-900">
                        Week of {formatDisplayDate(p.period_start)}
                      </p>
                      <p className="text-[11px] text-surface-500">
                        {isPaid ? `Paid on ${formatDisplayDate(p.paid_at)}` : 'Pending settlement'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-extrabold text-sm font-display tabular-nums text-surface-900 block">
                        {formatCurrency(p.amount)}
                      </span>
                      <Badge variant={isPaid ? 'veg' : 'pending'} size="xs">
                        {p.status}
                      </Badge>
                    </div>

                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(p)}
                        className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-tactile"
                        title="View Digital Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-float border border-surface-200 flex flex-col gap-4">
            <div className="text-center pb-2 border-b border-surface-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-subtle">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-surface-900">Digital Receipt</h3>
              <p className="text-xs text-surface-500">Week of {formatDisplayDate(selectedReceipt.period_start)}</p>
            </div>

            <div className="bg-surface-50 p-4 rounded-2xl text-xs space-y-2 text-surface-600 border border-surface-200/60">
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <strong className="text-surface-900 text-sm tabular-nums">
                  {formatCurrency(selectedReceipt.amount)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant="veg" size="xs">
                  Verified Paid ✓
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Payment Date:</span>
                <span className="text-surface-800">{formatDisplayDate(selectedReceipt.paid_at)}</span>
              </div>
              {selectedReceipt.receipt_notes && (
                <div className="pt-2 border-t border-surface-200 text-surface-500 italic">
                  "{selectedReceipt.receipt_notes}"
                </div>
              )}
            </div>

            <Button size="sm" variant="secondary" onClick={() => setSelectedReceipt(null)}>
              Close Receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
