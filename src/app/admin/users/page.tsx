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
      <button onClick={() => setOpen(!open)} disabled={isUpdating} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
        {isUpdating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: 36, width: 180, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
            <button onClick={() => { onToggleActive(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
              {user.is_active ? <><UserX size={14} color="#e11d48" />Deactivate</> : <><UserCheck size={14} color="#16a34a" />Activate</>}
            </button>
            <button onClick={() => { onToggleAdmin(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
              {user.role === 'admin' ? <><Shield size={14} color="#64748b" />Remove Admin</> : <><ShieldCheck size={14} color="#7c3aed" />Make Admin</>}
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

  const orgs = Array.from(new Set(users.map((u) => u.organisation_name || 'No Organisation')));
  const filteredUsers = orgFilter === 'all' ? users : users.filter((u) => (u.organisation_name || 'No Organisation') === orgFilter);
  const grouped: Record<string, User[]> = {};
  orgs.forEach((org) => { grouped[org] = filteredUsers.filter((u) => (u.organisation_name || 'No Organisation') === org); });

  const inputStyle: React.CSSProperties = { padding: '9px 12px 9px 34px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box' as const, width: '100%' };

  if (error) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <AlertCircle size={48} color="#e11d48" />
      <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>{error}</p>
      <button onClick={() => router.push('/admin')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to admin</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Link href="/admin" style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>User Management</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{users.length} users · {orgs.length} organisations</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input style={inputStyle} placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={{ padding: '9px 10px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: '#334155', outline: 'none', background: '#fff' }}>
            <option value="all">All Orgs</option>
            {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Users size={40} color="#cbd5e1" />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: '12px 0 4px' }}>No users found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([org, orgUsers]) => orgUsers.length === 0 ? null : (
            <div key={org} style={{ marginBottom: 24 }}>
              {/* Org header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={14} color="#2563eb" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{org}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', background: '#f1f5f9', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>{orgUsers.length}</span>
              </div>

              {/* Users in org */}
              {orgUsers.map((user) => (
                <div key={user.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{user.full_name || 'No name'}</div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{user.email}</div>
                      {user.phone && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{user.phone}</div>}
                    </div>
                    <ActionsDropdown
                      user={user}
                      onToggleActive={() => updateUser(user.id, { is_active: !user.is_active })}
                      onToggleAdmin={() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                      isUpdating={updating === user.id}
                    />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: user.role === 'admin' ? '#f5f3ff' : '#f1f5f9', color: user.role === 'admin' ? '#7c3aed' : '#475569' }}>
                      {user.role === 'admin' ? <ShieldCheck size={11} /> : <Users size={11} />}{user.role}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: user.is_active ? '#f0fdf4' : '#fff1f2', color: user.is_active ? '#16a34a' : '#e11d48' }}>
                      {user.is_active ? <UserCheck size={11} /> : <UserX size={11} />}{user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={13} />{user.invoice_count} invoices</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} />{formatTime(user.last_activity)}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
