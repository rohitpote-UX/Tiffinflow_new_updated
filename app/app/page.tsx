'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building,
  TrendingUp,
  Calendar as CalendarIcon,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, formatDisplayDate, formatFullDate } from '@/lib/utils/dates';
import { CountdownPill } from '@/components/ui/CountdownPill';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function EmployeeLunchPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<'veg' | 'non-veg' | 'skip' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [undoActive, setUndoActive] = useState(false);
  const [previousMeal, setPreviousMeal] = useState<'veg' | 'non-veg' | 'skip' | null>(null);
  const [undoSeconds, setUndoSeconds] = useState(5);
  const [errorToast, setErrorToast] = useState('');

  // Fetch today & tomorrow's meal status
  const loadMealData = useCallback(async () => {
    try {
      const res = await fetch('/api/meals/today');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.tomorrowMeal) {
          setSelectedMeal(json.tomorrowMeal.meal_type);
        } else if (json.membership?.defaultPreference === 'always-veg') {
          setSelectedMeal('veg');
        } else if (json.membership?.defaultPreference === 'always-non-veg') {
          setSelectedMeal('non-veg');
        }
      }
    } catch (e) {
      console.warn('Failed to load meal data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMealData();
    const interval = setInterval(loadMealData, 20000);
    return () => clearInterval(interval);
  }, [loadMealData]);

  // Undo Timer Countdown
  useEffect(() => {
    let timer: any;
    if (undoActive && undoSeconds > 0) {
      timer = setTimeout(() => setUndoSeconds((s) => s - 1), 1000);
    } else if (undoSeconds <= 0) {
      setUndoActive(false);
    }
    return () => clearTimeout(timer);
  }, [undoActive, undoSeconds]);

  const handleConfirmMeal = async (type: 'veg' | 'non-veg' | 'skip') => {
    if (submitting || data?.countdown?.isPassed) return;

    setPreviousMeal(selectedMeal);
    setSelectedMeal(type); // Instant Optimistic UI
    setUndoActive(true);
    setUndoSeconds(5);
    setSubmitting(true);
    setErrorToast('');

    // Trigger subtle celebratory confetti for lunch confirmation
    if (type !== 'skip') {
      try {
        confetti({
          particleCount: 28,
          spread: 50,
          origin: { y: 0.65 },
          colors:
            type === 'veg'
              ? ['#16A34A', '#86EFAC', '#F59E0B']
              : ['#DC2626', '#FCA5A5', '#F59E0B'],
        });
      } catch {}
    }

    try {
      const res = await fetch('/api/meals/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data?.targetDate,
          mealType: type,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Failed to save meal selection');
      }

      await loadMealData();
    } catch (err: any) {
      setSelectedMeal(previousMeal);
      setErrorToast(err.message || 'Could not save meal. Please try again.');
      setUndoActive(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!previousMeal) return;
    const prev = previousMeal;
    setUndoActive(false);
    await handleConfirmMeal(prev);
  };

  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-surface-500">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-tight">Preparing your lunch card...</p>
      </div>
    );
  }

  const office = data?.office;
  const isHoliday = Boolean(data?.schedule?.holiday);
  const isNonWorkingDay = !data?.schedule?.isWorkingDay;
  const countdown = data?.countdown;
  const weekly = data?.weeklySummary;

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-surface-500 text-xs font-semibold">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>{office?.name || 'Office'}</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-surface-900 tracking-tight mt-0.5">
            Tomorrow’s Lunch 🍱
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 block">
            Target Date
          </span>
          <div className="inline-flex items-center gap-1 text-xs font-bold text-surface-800 bg-surface-100 px-2.5 py-1 rounded-xl border border-surface-200/80">
            <CalendarIcon className="w-3.5 h-3.5 text-surface-500" />
            <span>{formatDisplayDate(data?.targetDate)}</span>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {errorToast && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Office Holiday or Non-Working Day States */}
      {isHoliday ? (
        <Card className="text-center py-10 px-6 bg-amber-50/40 border-amber-200/80">
          <span className="text-4xl block mb-3">🌴</span>
          <h3 className="text-base font-bold text-amber-950 mb-1">
            Office Holiday: {data.schedule.holiday}
          </h3>
          <p className="text-xs text-amber-800 max-w-xs mx-auto leading-relaxed">
            No tiffin or lunch service is scheduled for tomorrow. Enjoy your day off!
          </p>
        </Card>
      ) : isNonWorkingDay ? (
        <Card className="text-center py-10 px-6 bg-surface-100/60 border-surface-200">
          <span className="text-4xl block mb-3">🏖️</span>
          <h3 className="text-base font-bold text-surface-800 mb-1">Weekend / Non-Working Day</h3>
          <p className="text-xs text-surface-500 max-w-xs mx-auto leading-relaxed">
            Meal confirmation is closed for non-working days. Enjoy your weekend!
          </p>
        </Card>
      ) : (
        <>
          {/* Main 1-Tap Meal Selector Card */}
          <Card className="p-5 sm:p-6 border border-surface-200/80 shadow-card flex flex-col gap-4 relative overflow-hidden">
            {/* Cutoff Status & Success Indicator */}
            <div className="flex items-center justify-between">
              <CountdownPill
                urgency={countdown?.urgency}
                formattedTime={countdown?.formatted}
                cutoffTime={office?.cutoffTime}
              />

              {selectedMeal && (
                <Badge variant="veg" size="sm" dot>
                  Confirmed
                </Badge>
              )}
            </div>

            {/* Selection Options */}
            <div className="grid grid-cols-1 gap-3">
              {/* VEG SELECTION */}
              <button
                type="button"
                onClick={() => handleConfirmMeal('veg')}
                disabled={countdown?.isPassed || submitting}
                className={`p-4 rounded-2xl border-2 text-left transition-tactile flex items-center justify-between ${
                  selectedMeal === 'veg'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-surface-200 bg-surface-50/60 hover:bg-white hover:border-surface-300'
                } disabled:opacity-60 disabled:cursor-not-allowed select-none`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-subtle transition-all ${
                      selectedMeal === 'veg'
                        ? 'bg-emerald-600 text-white scale-105'
                        : 'bg-white border border-surface-200'
                    }`}
                  >
                    🥦
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-surface-900">Veg Meal</span>
                      {selectedMeal === 'veg' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-surface-500 block mt-0.5">
                      Fresh daily thali with dal, sabzi & rotis
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold font-display tabular-nums text-surface-900 block">
                    {formatCurrency(office?.vegPrice || 80)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Standard
                  </span>
                </div>
              </button>

              {/* NON-VEG SELECTION */}
              <button
                type="button"
                onClick={() => handleConfirmMeal('non-veg')}
                disabled={countdown?.isPassed || submitting}
                className={`p-4 rounded-2xl border-2 text-left transition-tactile flex items-center justify-between ${
                  selectedMeal === 'non-veg'
                    ? 'border-red-600 bg-red-50/60 shadow-sm ring-2 ring-red-500/20'
                    : 'border-surface-200 bg-surface-50/60 hover:bg-white hover:border-surface-300'
                } disabled:opacity-60 disabled:cursor-not-allowed select-none`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-subtle transition-all ${
                      selectedMeal === 'non-veg'
                        ? 'bg-red-600 text-white scale-105'
                        : 'bg-white border border-surface-200'
                    }`}
                  >
                    🍗
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-surface-900">Non-Veg Meal</span>
                      {selectedMeal === 'non-veg' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-surface-500 block mt-0.5">
                      Protein-rich chicken/egg curry combo
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold font-display tabular-nums text-surface-900 block">
                    {formatCurrency(office?.nonVegPrice || 100)}
                  </span>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                    Protein
                  </span>
                </div>
              </button>

              {/* SKIP SELECTION */}
              <button
                type="button"
                onClick={() => handleConfirmMeal('skip')}
                disabled={countdown?.isPassed || submitting}
                className={`p-3.5 rounded-2xl border-2 text-left transition-tactile flex items-center justify-between ${
                  selectedMeal === 'skip'
                    ? 'border-surface-700 bg-surface-100 shadow-sm'
                    : 'border-surface-200 bg-white hover:bg-surface-50'
                } disabled:opacity-60 disabled:cursor-not-allowed select-none`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center text-lg">
                    ⏭️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-surface-800">Skip Tomorrow</span>
                      {selectedMeal === 'skip' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-700 text-white px-2 py-0.5 rounded-full">
                          Skipped
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-surface-500">
                      Eating out or working from home
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-surface-500">₹0</span>
              </button>
            </div>

            {/* Smart Default Transparency Alert */}
            {data?.tomorrowMeal?.isAutoDefaulted && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Auto-selected from your default preference (
                    <strong className="capitalize">{data.membership?.defaultPreference}</strong>).
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Floating Undo Feedback Bar */}
          {undoActive && previousMeal && (
            <div className="bg-surface-900 text-white p-4 rounded-2xl shadow-float flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200 border border-surface-700">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-bold capitalize">
                  ✓ {selectedMeal} selected
                </span>
                <span className="text-surface-400">· ({undoSeconds}s)</span>
              </div>
              <button
                type="button"
                onClick={handleUndo}
                className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-tactile"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </button>
            </div>
          )}

          {/* Last Choice Quick Repeat */}
          {data?.lastChoice && selectedMeal !== data.lastChoice && !countdown?.isPassed && (
            <div className="bg-white rounded-2xl p-4 border border-surface-200/80 flex items-center justify-between text-xs shadow-subtle">
              <span className="text-surface-600">
                Last choice: <strong className="capitalize text-surface-900">{data.lastChoice}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleConfirmMeal(data.lastChoice)}
                className="text-emerald-700 font-bold hover:text-emerald-800 transition flex items-center gap-1"
              >
                Repeat {data.lastChoice === 'veg' ? 'Veg 🥦' : 'Non-Veg 🍗'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Weekly Summary Card */}
          {weekly && (
            <Card className="p-5 border border-surface-200/80 shadow-card">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                    This Week’s Summary
                  </span>
                </div>
                <span className="text-sm font-extrabold font-display tabular-nums text-surface-900">
                  {formatCurrency(weekly.totalAmount)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100/80">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">Veg</span>
                  <span className="text-sm font-extrabold tabular-nums text-emerald-900">
                    {weekly.vegDays} days
                  </span>
                </div>
                <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-100/80">
                  <span className="text-[10px] text-red-700 uppercase font-bold block">Non-Veg</span>
                  <span className="text-sm font-extrabold tabular-nums text-red-900">
                    {weekly.nonVegDays} days
                  </span>
                </div>
                <div className="bg-surface-100 p-2.5 rounded-xl border border-surface-200">
                  <span className="text-[10px] text-surface-500 uppercase font-bold block">Skipped</span>
                  <span className="text-sm font-extrabold tabular-nums text-surface-700">
                    {weekly.skippedDays} days
                  </span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
