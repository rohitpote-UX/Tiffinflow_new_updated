'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Send, Copy, Check, Printer, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatCurrency, formatDisplayDate } from '@/lib/utils/dates';
import { Button } from '@/components/ui/Button';

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catererText, setCatererText] = useState('');
  const [copied, setCopied] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/weekly');
      const json = await res.json();
      if (json.success) setReportData(json.report);

      const catRes = await fetch('/api/reports/caterer');
      const catJson = await catRes.json();
      if (catJson.success) setCatererText(catJson.whatsAppText);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportExcel = () => {
    if (!reportData?.userBreakdown) return;

    const rows = reportData.userBreakdown.map((u: any) => ({
      'Employee Name': u.userName,
      'Email': u.email,
      'Veg Meals': u.vegDays,
      'Non-Veg Meals': u.nonVegDays,
      'Skipped Days': u.skippedDays,
      'Total Amount (INR)': u.totalAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Meals');

    XLSX.writeFile(workbook, `BiteBuddy_Report_${reportData.startDate}_${reportData.endDate}.xlsx`);
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(catererText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-zinc-500 font-sans">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
        <p className="text-xs">Generating office report...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Reports & Caterer Dispatch 📈
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Weekly meal audit, Excel export, and WhatsApp caterer template
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportExcel}
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-300 border border-zinc-800 hover:bg-zinc-850 hover:text-white"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Caterer WhatsApp Summary Card */}
      <div className="bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-800 flex flex-col gap-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Formatted Caterer Message (1-Click WhatsApp)</span>
          </div>
          <Button
            size="xs"
            variant="ghost"
            className="text-zinc-200 border border-zinc-750 bg-zinc-800 hover:bg-zinc-700"
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyWhatsApp}
          >
            {copied ? 'Copied to Clipboard!' : 'Copy for WhatsApp'}
          </Button>
        </div>

        <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-300 text-xs font-mono whitespace-pre-wrap border border-zinc-800/80 leading-relaxed overflow-x-auto">
          {catererText}
        </pre>
      </div>

      {/* Weekly Report Table */}
      {reportData && (
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-card">
          <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Weekly Team Breakdown</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Period: {formatDisplayDate(reportData.startDate)} – {formatDisplayDate(reportData.endDate)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Total Week Revenue
              </span>
              <span className="text-xl font-extrabold font-display tabular-nums text-emerald-400">
                {formatCurrency(reportData.totalRevenue)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4 text-center">Veg Days</th>
                  <th className="px-5 py-4 text-center">Non-Veg Days</th>
                  <th className="px-5 py-4 text-center">Skipped</th>
                  <th className="px-5 py-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {reportData.userBreakdown.map((u: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{u.userName}</div>
                      <div className="text-[11px] text-zinc-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-4 text-center font-bold tabular-nums text-emerald-400">
                      {u.vegDays}
                    </td>
                    <td className="px-5 py-4 text-center font-bold tabular-nums text-red-400">
                      {u.nonVegDays}
                    </td>
                    <td className="px-5 py-4 text-center tabular-nums text-zinc-500">
                      {u.skippedDays}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold font-display tabular-nums text-white text-sm">
                      {formatCurrency(u.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
