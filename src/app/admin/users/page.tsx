'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, ArrowLeft, Shield, ShieldCheck, UserX, UserCheck, FileText, Clock, Loader2, AlertCircle, ChevronDown, Building2 } from 'lucide-react';

interface User {
  id: string; email: string; full_name: string | null; phone: string | null;
  role: 'user' | 'admin'; is_active: boolean; last_login_at: string | null;
  created_at: string; invoice_count: number; last_activity: string | null;
  organisation_name: string | null; organisation_id: string | null;
}

const T = {
  bg: '#0f0f0f', surface: '#1c1c1c', surfaceHigh: '#242424', border: '#2a2a2a',
  borderHigh: '#383838', text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  accent: '#38bdf8', accentGlow: 'rgba(56,189,248,0.1)',
  success: '#86efac', successBg: 'rgba(134,239,172,0.08)',
  warning: '#fdba74', warningBg: 'rgba(253,186,116,0.08)',
  error: '#fca5a5', errorBg: 'rgba(252,165,165,0.08)',
  purple: '#c084fc', purpleBg: 'rgba(192,132,252,0.08)',
};

function formatTime(date: string | null) {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function ActionsDropdown({ user, onToggleActive, onToggleAdmin, isUpdating }: {
  user: User; onToggleActive: () => void; onToggleAdmin: () => void; isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} disabled={isUpdating} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, cursor: 'pointer', transition: 'border-color 0.15s' }}>
        {isUpdating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: 36, width: 180, background: T.surface, border: `1px solid ${T.borderHigh}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden' }}>
            <button onClick={() => { onToggleActive(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: T.textDim, cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}>
              {user.is_active ? <><UserX size={14} color={T.error} />Deactivate</> : <><UserCheck size={14} color={T.success} />Activate</>}
            </button>
            <button onClick={() => { onToggleAdmin(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: T.textDim, cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}>
              {user.role === 'admin' ? <><Shield size={14} color={T.textMuted} />Remove Admin</> : <><ShieldCheck size={14} color={T.purple} />Make Admin</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { fetchUsers(); }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) { router.push('/invoices'); return; }
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally { setLoading(false); }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    } finally { setUpdating(null); }
  };

  const orgNames = Array.from(new Set(users.map((u) => u.organisation_name || 'No Organisation')));
  const filteredUsers = orgFilter === 'all' ? users : users.filter((u) => (u.organisation_name || 'No Organisation') === orgFilter);
  const grouped: Record<string, User[]> = {};
  orgNames.forEach((org) => { grouped[org] = filteredUsers.filter((u) => (u.organisation_name || 'No Organisation') === org); });

  if (error) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: T.bg }}>
      <AlertCircle size={40} color={T.error} />
      <p style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '16px 0 8px' }}>{error}</p>
      <button onClick={() => router.push('/admin')} style={{ color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to admin</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link href="/admin" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>User Management</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>{users.length} users · {orgNames.length} organisation{orgNames.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
            <input
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.text, outline: 'none', fontFamily: 'inherit', background: T.bg, boxSizing: 'border-box' }}
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            style={{ padding: '9px 10px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.text, outline: 'none', background: T.bg }}
          >
            <option value="all">All Orgs</option>
            {orgNames.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={28} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: T.textMuted }}>
            <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.textDim }}>No users found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([org, orgUsers]) => orgUsers.length === 0 ? null : (
            <div key={org} style={{ marginBottom: 28 }}>
              {/* Org header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accentGlow, border: `1px solid rgba(56,189,248,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={13} color={T.accent} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{org}</span>
                <span style={{ fontSize: 11, color: T.textMuted, background: T.surfaceHigh, padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>{orgUsers.length}</span>
              </div>

              {/* Users grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
                {orgUsers.map((user) => (
                  <div key={user.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || 'No name'}</div>
                        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                        {user.phone && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{user.phone}</div>}
                      </div>
                      <ActionsDropdown
                        user={user}
                        onToggleActive={() => updateUser(user.id, { is_active: !user.is_active })}
                        onToggleAdmin={() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                        isUpdating={updating === user.id}
                      />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: user.role === 'admin' ? T.purpleBg : T.surfaceHigh, color: user.role === 'admin' ? T.purple : T.textDim, border: `1px solid ${user.role === 'admin' ? 'rgba(192,132,252,0.3)' : T.border}` }}>
                        {user.role === 'admin' ? <ShieldCheck size={10} /> : <Users size={10} />}{user.role}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: user.is_active ? T.successBg : T.errorBg, color: user.is_active ? T.success : T.error, border: `1px solid ${user.is_active ? 'rgba(134,239,172,0.3)' : 'rgba(252,165,165,0.3)'}` }}>
                        {user.is_active ? <UserCheck size={10} /> : <UserX size={10} />}{user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: T.textMuted }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} />{user.invoice_count} docs</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{formatTime(user.last_activity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
