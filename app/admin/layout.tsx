'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  CreditCard,
  FileBarChart,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Building,
  Loader2,
  ExternalLink,
} from 'lucide-react';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Live Orders', icon: ShoppingBag },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports & Caterer', icon: FileBarChart },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit', label: 'Audit Logs', icon: Shield },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        const role = data.role || data.user?.role || data.membership?.role;
        if (data.authenticated && role === 'ADMIN') {
          setProfile(data);
        } else if (data.authenticated) {
          router.push('/app');
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs font-medium tracking-tight">Opening Admin Console...</p>
      </div>
    );
  }

  const office = profile?.office;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-white">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-base font-bold shadow-button-brand">
            🍱
          </div>
          <div>
            <span className="font-bold text-sm font-display text-white block">BiteBuddy</span>
            <span className="text-[10px] text-zinc-400 block -mt-1 font-semibold">{office?.name}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-tactile"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block md:w-64 bg-zinc-900/95 border-r border-zinc-800 p-5 flex flex-col justify-between fixed md:sticky top-0 h-screen z-30`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand & Office Identifier */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-button-brand shrink-0">
              🍱
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base font-display text-white tracking-tight">
                  BiteBuddy
                </span>
                <span className="text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded tracking-wider">
                  Admin
                </span>
              </div>
              <span className="text-xs text-zinc-400 truncate block max-w-[135px] font-medium mt-0.5">
                {office?.name || 'Office Admin'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-tactile select-none ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-button-brand font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2.25]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
          <Link
            href="/app"
            className="text-xs text-zinc-400 hover:text-emerald-400 px-3 py-2 rounded-xl hover:bg-zinc-800 flex items-center justify-between transition-tactile font-medium"
          >
            <span>Switch to Employee View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-tactile"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 min-h-screen bg-zinc-950 p-4 sm:p-8 overflow-y-auto max-w-6xl">
        {children}
      </main>
    </div>
  );
}
