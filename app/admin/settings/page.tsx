'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate, formatTime12h } from '@/lib/utils/dates';
import { Button } from '@/components/ui/Button';

const DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [vegPrice, setVegPrice] = useState(80);
  const [nonVegPrice, setNonVegPrice] = useState(100);
  const [cutoffTime, setCutoffTime] = useState('19:00');
  const [autoDefault, setAutoDefault] = useState(true);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // New holiday form
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/offices/settings').then((r) => r.json()),
      fetch('/api/offices/holidays').then((r) => r.json()),
    ])
      .then(([setRes, holRes]) => {
        if (setRes.success && setRes.office) {
          setSettings(setRes.office);
          setName(setRes.office.name);
          setVegPrice(setRes.office.vegPrice);
          setNonVegPrice(setRes.office.nonVegPrice);
          setCutoffTime(setRes.office.cutoffTime);
          setAutoDefault(setRes.office.autoDefaultEnabled);
          setWorkingDays(setRes.office.workingDays || [1, 2, 3, 4, 5]);
        }
        if (holRes.success && holRes.holidays) {
          setHolidays(holRes.holidays);
        }
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/offices/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          vegPrice: Number(vegPrice),
          nonVegPrice: Number(nonVegPrice),
          cutoffTime,
          autoDefaultEnabled: autoDefault,
          workingDays,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage('✓ Office settings saved successfully!');
        setTimeout(() => setToastMessage(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId: number) => {
    if (workingDays.includes(dayId)) {
      setWorkingDays(workingDays.filter((d) => d !== dayId));
    } else {
      setWorkingDays([...workingDays, dayId]);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName) return;
    setAddingHoliday(true);
    try {
      const res = await fetch('/api/offices/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId: settings.id,
          date: holidayDate,
          name: holidayName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setHolidays([...holidays, json.holiday]);
        setHolidayDate('');
        setHolidayName('');
      }
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleRemoveHoliday = async (holidayId: string) => {
    await fetch('/api/offices/holidays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holidayId }),
    });
    setHolidays(holidays.filter((h) => h.id !== holidayId));
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-sans">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
        <p className="text-xs">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Office Settings ⚙️
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure meal pricing, daily cutoff boundaries, and holidays
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-button-brand">
          {toastMessage}
        </div>
      )}

      {/* Main Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-zinc-900 rounded-3xl p-6 sm:p-7 border border-zinc-800 flex flex-col gap-5 shadow-card"
      >
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            Office / Organization Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              🥦 Veg Price (₹)
            </label>
            <input
              type="number"
              required
              min={1}
              value={vegPrice}
              onChange={(e) => setVegPrice(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              🍗 Non-Veg Price (₹)
            </label>
            <input
              type="number"
              required
              min={1}
              value={nonVegPrice}
              onChange={(e) => setNonVegPrice(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Daily Cutoff Time (HH:MM format)
            </label>
            <span className="text-xs font-bold text-emerald-400">
              Displays as: {formatTime12h(cutoffTime)}
            </span>
          </div>
          <input
            type="text"
            required
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            placeholder="19:00"
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Working Days */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Active Meal Days (Working Days)
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const isSelected = workingDays.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-button-brand'
                      : 'bg-zinc-950 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto Default Toggle */}
        <div className="flex items-center justify-between pt-3.5 border-t border-zinc-800/80">
          <div>
            <span className="text-xs font-bold text-white block">Auto-Default Meal Rules</span>
            <span className="text-[11px] text-zinc-400 leading-relaxed">
              Automatically apply employee dietary preferences past cutoff time.
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoDefault}
            onChange={(e) => setAutoDefault(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        <Button size="md" variant="primary" isLoading={saving} type="submit" className="mt-2">
          Save Office Settings
        </Button>
      </form>

      {/* Holidays Management */}
      <div className="bg-zinc-900 rounded-3xl p-6 sm:p-7 border border-zinc-800 flex flex-col gap-4 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Office Holidays & No-Meal Dates
        </h3>

        {/* Add Holiday Form */}
        <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            required
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
          />
          <input
            type="text"
            required
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            placeholder="Holiday Name (e.g. Independence Day)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button
            size="sm"
            variant="ghost"
            className="bg-zinc-800 hover:bg-zinc-750 text-white shrink-0"
            leftIcon={<Plus className="w-4 h-4" />}
            isLoading={addingHoliday}
            type="submit"
          >
            Add
          </Button>
        </form>

        {/* Holidays List */}
        <div className="divide-y divide-zinc-800/80">
          {holidays.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3">No upcoming office holidays configured.</p>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{h.name}</span>
                  <span className="text-[11px] text-zinc-500">{formatDisplayDate(h.date)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveHoliday(h.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-zinc-800 transition-tactile"
                  title="Delete Holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
