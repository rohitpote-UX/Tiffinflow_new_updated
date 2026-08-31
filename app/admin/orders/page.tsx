'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate, formatTime12h } from '@/lib/utils/dates';
import { Badge } from '@/components/ui/Badge';
import { useRealtimeSync } from '@/lib/realtime/useRealtimeSync';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'veg' | 'non-veg' | 'skip'>('all');

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const json = await res.json();
      if (json.success) {
        setOrders(json.orders);
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  const { isConnected } = useRealtimeSync({
    onReconcile: loadOrders,
    onEvent: (event) => {
      if (
        event.type === 'MEAL_UPDATED' ||
        event.type === 'ORDER_FINALIZED' ||
        event.type === 'MEAL_CANCELLED'
      ) {
        loadOrders();
      }
    },
  });

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filterType === 'all' || o.mealType === filterType;
    const matchesSearch =
      o.userName.toLowerCase().includes(search.toLowerCase()) ||
      o.userEmail.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Live Orders Queue 📦
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time feed of employee meal choices for tomorrow
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Filter Pills */}
        <div className="flex p-1 bg-zinc-900 rounded-2xl border border-zinc-800 self-start">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white shadow-button-brand'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('veg')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
              filterType === 'veg'
                ? 'bg-emerald-600 text-white shadow-button-brand'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🥦 Veg ({orders.filter((o) => o.mealType === 'veg').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('non-veg')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
              filterType === 'non-veg'
                ? 'bg-red-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🍗 Non-Veg ({orders.filter((o) => o.mealType === 'non-veg').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('skip')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-tactile select-none ${
              filterType === 'skip'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⏭️ Skip ({orders.filter((o) => o.mealType === 'skip').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-card">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
            <p className="text-xs">Loading live orders queue...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            <p>No orders match the current filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Meal Selection</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Confirmed At</th>
                  <th className="px-5 py-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {filteredOrders.map((order) => {
                  const isVeg = order.mealType === 'veg';
                  const isNonVeg = order.mealType === 'non-veg';

                  return (
                    <tr key={order.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{order.userName}</div>
                        <div className="text-[11px] text-zinc-500">{order.userEmail}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isVeg
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isNonVeg
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {isVeg ? '🥦 Veg' : isNonVeg ? '🍗 Non-Veg' : '⏭️ Skip'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold tabular-nums text-white text-sm">
                        {formatCurrency(order.price)}
                      </td>
                      <td className="px-5 py-4 text-zinc-400 tabular-nums font-medium">
                        {order.confirmedAt ? formatTime12h(order.confirmedAt) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {order.isAutoDefaulted ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] bg-amber-400/10 px-2 py-0.5 rounded">
                            <Sparkles className="w-3 h-3" /> Auto-Default
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Manual</span>
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
    </div>
  );
}
