'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, QrCode, Copy, Check, UserMinus, ShieldCheck, ShieldAlert, X, Loader2, RefreshCw, Link as LinkIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [officeCode, setOfficeCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [rotatingCode, setRotatingCode] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setMembers(json.members);

      const meRes = await fetch('/api/auth/me');
      const meJson = await meRes.json();
      if (meJson.office?.join_code) {
        setOfficeCode(meJson.office.join_code);
        const origin = window.location.origin;
        const joinUrl = `${origin}/join/${meJson.office.join_code}`;
        const qrUrl = await QRCode.toDataURL(joinUrl, { width: 320, margin: 2 });
        setQrDataUrl(qrUrl);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleCopy = () => {
    navigator.clipboard.writeText(officeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/join/${officeCode}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRotateCode = async () => {
    if (!confirm('Generate a new Join Code? Previous invite links will no longer work.')) return;
    setRotatingCode(true);
    try {
      const res = await fetch('/api/admin/invite/rotate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to rotate join code');

      setOfficeCode(json.joinCode);
      setToastMessage('✓ New join code generated successfully');
      setTimeout(() => setToastMessage(''), 3000);
      const origin = window.location.origin;
      const joinUrl = `${origin}/join/${json.joinCode}`;
      const qrUrl = await QRCode.toDataURL(joinUrl, { width: 320, margin: 2 });
      setQrDataUrl(qrUrl);
    } catch (err: any) {
      setToastError(err.message || 'Failed to rotate join code');
      setTimeout(() => setToastError(''), 4000);
    } finally {
      setRotatingCode(false);
    }
  };

  const handleRoleChange = async (userId: string, targetRole: 'ADMIN' | 'USER', userName: string) => {
    const actionText = targetRole === 'ADMIN' ? 'promote' : 'demote';
    if (!confirm(`Are you sure you want to ${actionText} ${userName} to ${targetRole}?`)) return;

    setActionLoadingId(userId);
    setToastMessage('');
    setToastError('');

    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: targetRole }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update role');
      }

      setToastMessage(json.message || `✓ Role updated successfully`);
      setTimeout(() => setToastMessage(''), 4000);
      await loadMembers();
    } catch (err: any) {
      setToastError(err.message || 'Action failed');
      setTimeout(() => setToastError(''), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the office?`)) return;
    setActionLoadingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMessage(`✓ ${userName} removed from office`);
        setTimeout(() => setToastMessage(''), 3000);
        await loadMembers();
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const adminMembers = members.filter((m) => m.role === 'ADMIN');
  const adminCount = adminMembers.length;
  const isMaxAdminsReached = adminCount >= 2;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-button-brand animate-in fade-in">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {toastError && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-900 text-red-200 text-xs font-bold flex items-center justify-between shadow-card animate-in fade-in">
          <span>{toastError}</span>
          <button type="button" onClick={() => setToastError('')} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Team Members 👥
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {members.length} active office employees enrolled
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<QrCode className="w-4 h-4" />}
          onClick={() => setShowQrModal(true)}
        >
          Display Office QR Code
        </Button>
      </div>

      {/* Admin Quota Indicator Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-zinc-900 rounded-3xl p-5 border border-zinc-800 flex flex-col justify-between shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Administrators
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isMaxAdminsReached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {adminCount} / 2 Admins {isMaxAdminsReached ? '(Max)' : ''}
            </span>
          </div>

          <div className="my-3 space-y-1">
            {adminMembers.map((adm) => (
              <div key={adm.id} className="flex items-center gap-2 text-xs text-zinc-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate">{adm.name}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500">
            {isMaxAdminsReached
              ? 'Maximum 2 office administrators allocated.'
              : '1 additional administrator slot available.'}
          </p>
        </div>

        {/* Join Code Banner */}
        <div className="md:col-span-2 bg-zinc-900 rounded-3xl p-5 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Employee Invite Code
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="font-mono text-xl font-extrabold text-emerald-400 uppercase tracking-wider bg-zinc-950 px-3.5 py-1 rounded-xl border border-zinc-800">
                {officeCode}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-tactile"
                title="Copy Join Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-tactile"
                title="Copy Direct Join Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                disabled={rotatingCode}
                onClick={handleRotateCode}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-tactile disabled:opacity-50"
                title="Rotate / Regenerate Join Code"
              >
                <RefreshCw className={`w-4 h-4 ${rotatingCode ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Share this code or QR code with employees to let them join your office in seconds without creating a workspace.
          </p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-card">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
            <p className="text-xs">Loading team roster...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            <p>No active employees found. Invite your team using the join code above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Dietary Default</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                {members.map((m) => {
                  const isAdmin = m.role === 'ADMIN';
                  const isBusy = actionLoadingId === m.id;

                  return (
                    <tr key={m.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{m.name}</div>
                        <div className="text-[11px] text-zinc-500">{m.email}</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-400 tabular-nums">{m.phone}</td>
                      <td className="px-5 py-4">
                        <span className="capitalize font-semibold text-zinc-200">
                          {m.defaultPreference}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin ? (
                            <button
                              type="button"
                              disabled={isBusy || adminCount <= 1}
                              onClick={() => handleRoleChange(m.id, 'USER', m.name)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title={adminCount <= 1 ? 'An office must have at least 1 administrator' : 'Demote to regular user'}
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy || isMaxAdminsReached}
                              onClick={() => handleRoleChange(m.id, 'ADMIN', m.name)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title={isMaxAdminsReached ? 'Maximum 2 administrators limit reached' : 'Promote to administrator'}
                            >
                              Make Admin
                            </button>
                          )}

                          {!isAdmin && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeactivate(m.id, m.name)}
                              className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-tactile"
                              title="Remove user from office"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Poster Display Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-float text-center flex flex-col items-center gap-4 text-zinc-900">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-bold font-display text-zinc-900">Office Invite QR</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Display or print this QR code at your office lunch area for 1-scan onboarding.
            </p>

            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="BiteBuddy Join QR"
                className="w-56 h-56 rounded-2xl border-4 border-zinc-100 shadow-sm"
              />
            )}

            <div className="bg-zinc-50 p-3 rounded-xl w-full text-xs font-mono font-bold text-emerald-700 border border-zinc-200 uppercase">
              Code: {officeCode}
            </div>

            <Button size="sm" variant="primary" className="w-full" onClick={() => window.print()}>
              Print QR Poster
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
