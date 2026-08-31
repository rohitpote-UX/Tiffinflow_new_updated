'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Utensils, Calendar, CreditCard, User } from 'lucide-react';
import { PushPermissionBanner } from '@/components/pwa/PushPermissionBanner';

const NAV_ITEMS = [
  { href: '/app', label: 'Lunch', icon: Utensils },
  { href: '/app/history', label: 'History', icon: Calendar },
  { href: '/app/payments', label: 'Payments', icon: CreditCard },
  { href: '/app/profile', label: 'Profile', icon: User },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-between max-w-md mx-auto sm:border-x sm:border-surface-200/80 shadow-2xl relative font-sans">
      {/* Top Non-intrusive Push Banner */}
      <PushPermissionBanner />

      {/* Main Employee Content */}
      <div className="flex-1 pb-24 overflow-y-auto">{children}</div>

      {/* Floating Frosted Glass Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-panel border-t border-surface-200/80 px-4 py-2 flex items-center justify-around z-30 safe-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-tactile select-none ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-surface-500 hover:text-surface-800 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 scale-105'
                    : 'text-surface-400'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.25]" />
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
