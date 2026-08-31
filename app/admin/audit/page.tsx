'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock, Loader2 } from 'lucide-react';
import { formatAuditTimestamp } from '@/lib/utils/dates';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLogs(data.logs);
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Security & Audit Trail 🛡️
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable log of all administrative actions, price adjustments, and cutoff extensions
          </p>
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-card">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
            <p className="text-xs">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            <p>No administrative mutations recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Target Entity</th>
                  <th className="px-5 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-5 py-4 text-zinc-400 whitespace-nowrap tabular-nums font-medium">
                      {formatAuditTimestamp(log.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-zinc-300 uppercase">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg inline-block border border-zinc-850">
                          {JSON.stringify(log.metadata)}
                        </pre>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
