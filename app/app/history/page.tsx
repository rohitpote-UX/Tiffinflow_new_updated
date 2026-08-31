'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate, formatFullDate } from '@/lib/utils/dates';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EmployeeHistoryPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayMeal, setSelectedDayMeal] = useState<any>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meals/history?year=${currentYear}&month=${currentMonth}`);
      const data = await res.json();
      if (data.success) {
        setHistoryData(data);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar matrix calculation
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();

  const mealsMap = new Map();
  if (historyData?.meals) {
    for (const m of historyData.meals) {
      mealsMap.set(m.date, m);
    }
  }

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-4 font-sans">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold font-display text-surface-900 tracking-tight">
          Meal History 📅
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          View your past lunch choices and monthly expenses
        </p>
      </div>

      {/* Month Navigator & Calendar Card */}
      <Card className="p-5 sm:p-6 border border-surface-200/80 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-tactile"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold font-display text-surface-900">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-tactile"
            aria-label="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {DAYS_OF_WEEK.map((d) => (
            <span key={d} className="text-[11px] font-bold text-surface-400">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Matrix */}
        {loading ? (
          <div className="py-14 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-12" />;
              }

              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
                day
              ).padStart(2, '0')}`;
              const meal = mealsMap.get(dateStr);

              let bgStyle = 'bg-surface-50 text-surface-700 hover:bg-surface-100';
              let emoji = '';

              if (meal) {
                if (meal.meal_type === 'veg') {
                  bgStyle =
                    'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold shadow-subtle';
                  emoji = '🥦';
                } else if (meal.meal_type === 'non-veg') {
                  bgStyle =
                    'bg-red-50 text-red-900 border border-red-300 font-bold shadow-subtle';
                  emoji = '🍗';
                } else if (meal.meal_type === 'skip') {
                  bgStyle = 'bg-surface-200 text-surface-600 border border-surface-300';
                  emoji = '⏭️';
                }
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => meal && setSelectedDayMeal(meal)}
                  className={`h-12 rounded-2xl flex flex-col items-center justify-center text-xs transition-tactile select-none relative ${bgStyle}`}
                >
                  <span className="text-[11px] leading-tight tabular-nums">{day}</span>
                  {emoji && <span className="text-[11px] leading-none mt-0.5">{emoji}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-3.5 border-t border-surface-100 flex items-center justify-around text-[11px] text-surface-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Veg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Non-Veg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-surface-400" />
            <span>Skipped</span>
          </div>
        </div>
      </Card>

      {/* Monthly Expenditure Card */}
      {historyData?.stats && (
        <Card className="p-5 border border-surface-200/80 shadow-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">
            {MONTH_NAMES[currentMonth - 1]} Spending Breakdown
          </h3>

          <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-surface-100">
            <span className="text-xs font-semibold text-surface-600">Total Month Spend</span>
            <span className="text-xl font-extrabold font-display tabular-nums text-surface-900">
              {formatCurrency(historyData.stats.totalAmount)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100/60">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Veg Meals</span>
              <span className="text-base font-extrabold tabular-nums text-emerald-900">
                {historyData.stats.vegCount}
              </span>
            </div>
            <div className="bg-red-50 p-3 rounded-2xl border border-red-100/60">
              <span className="text-[10px] text-red-700 font-bold uppercase block">Non-Veg</span>
              <span className="text-base font-extrabold tabular-nums text-red-900">
                {historyData.stats.nonVegCount}
              </span>
            </div>
            <div className="bg-surface-100 p-3 rounded-2xl border border-surface-200">
              <span className="text-[10px] text-surface-500 font-bold uppercase block">Skipped</span>
              <span className="text-base font-extrabold tabular-nums text-surface-700">
                {historyData.stats.skippedCount}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Selected Day Meal Detail Modal */}
      {selectedDayMeal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-float border border-surface-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {selectedDayMeal.meal_type === 'veg'
                    ? '🥦'
                    : selectedDayMeal.meal_type === 'non-veg'
                    ? '🍗'
                    : '⏭️'}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-surface-900 capitalize">
                    {selectedDayMeal.meal_type} Lunch
                  </h4>
                  <p className="text-xs text-surface-500">{formatFullDate(selectedDayMeal.date)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayMeal(null)}
                className="p-1 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface-50 p-4 rounded-2xl text-xs space-y-2 text-surface-600 border border-surface-200/60">
              <div className="flex justify-between">
                <span>Amount:</span>
                <strong className="text-surface-900 tabular-nums">
                  {formatCurrency(selectedDayMeal.price)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant="success" size="xs">
                  {selectedDayMeal.status}
                </Badge>
              </div>
              {selectedDayMeal.is_auto_defaulted && (
                <div className="flex justify-between text-amber-700">
                  <span>Auto-Applied:</span>
                  <span>Default preference</span>
                </div>
              )}
            </div>

            <Button size="sm" variant="secondary" onClick={() => setSelectedDayMeal(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
