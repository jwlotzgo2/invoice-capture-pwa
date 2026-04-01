'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Shield, ShieldCheck, UserX, UserCheck, FileText, Clock, Loader2, AlertCircle, ChevronDown, Building2 } from 'lucide-react';
import AdminShell from '@/components/AdminShell';

interface User {
  id: string; email: string; full_name: string | null; phone: string | null;
  role: 'user' | 'admin'; is_active: boolean; last_login_at: string | null;
  created_at: string; invoice_count: number; last_activity: string | null;
  organisation_name: string | null; organisation_id: string | null;
}

const C = {
  bg:           '#070e1a',
  surface:      '#0c1628',
  surfaceHi:    '#0f1e35',
  border:       '#142a45',
  borderHi:     '#1d3f63',
  accent:       '#0096c7',
  accentBright: '#22d3ee',
  accentGlow:   'rgba(0,150,199,0.1)',
  green:        '#10b981',
  greenGlow:    'rgba(16,185,129,0.1)',
  amber:        '#f59e0b',
  red:          '#ef4444',
  redGlow:      'rgba(239,68,68,0.1)',
  purple:       '#a855f7',
  purpleGlow:   'rgba(168,85,247,0.1)',
  text:         '#d4e5f5',
  dim:          '#6890b0',
  muted:        '#2d4a65',
};

const pageCss = `
  .usr-page { padding: 0; }

  .usr-table-wrap { overflow-x: auto; }

  .usr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .usr-table th {
    font-size: 10px;
    font-weight: 700;
    color: ${C.muted};
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 10px 16px;
    text-align: left;
    background: ${C.surface};
    border-bottom: 1px solid ${C.border};
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .usr-table td {
    padding: 10px 16px;
    color: ${C.text};
    border-bottom: 1px solid ${C.border};
    vertical-align: middle;
    white-space: nowrap;
  }
  .usr-table tr:hover td { background: ${C.surfaceHi}; }

  .usr-group-header td {
    background: ${C.bg} !important;
    padding: 14px 16px 6px;
    border-bottom: 1px solid ${C.border};
  }

  .usr-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.3px;
  }

  .usr-search {
    display: flex; align-items: center; gap: 6px;
    background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 7px;
    padding: 0 10px; transition: border-color 0.15s;
  }
  .usr-search:focus-within { border-color: ${C.accent}; }
  .usr-search input {
    background: none; border: none; outline: none;
    color: ${C.text}; font-size: 13px; padding: 7px 0; width: 220px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }
  .usr-search input::placeholder { color: ${C.muted}; }

  .usr-select {
    padding: 7px 10px; border: 1px solid ${C.border}; border-radius: 7px; font-size: 12px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; transition: border-color 0.15s; min-width: 140px;
  }
  .usr-select:focus { border-color: ${C.accent}; }

  .usr-actions-btn {
    width: 30px; height: 30px; border-radius: 7px; border: 1px solid ${C.border};
    background: ${C.surfaceHi}; display: flex; align-items: center; justify-content: center;
    color: ${C.dim}; cursor: pointer; transition: border-color 0.15s;
  }
  .usr-actions-btn:hover { border-color: ${C.borderHi}; }

  .usr-empty { text-align: center; padding: 60px 24px; color: ${C.muted}; }

  .usr-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
`;

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
      <button onClick={() => setOpen(!open)} disabled={isUpdating} className="usr-actions-btn">
        {isUpdating ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: 34, width: 180, background: '#0c1628', border: `1px solid ${C.borderHi}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden' }}>
            <button onClick={() => { onToggleActive(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: C.dim, cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}>
              {user.is_active ? <><UserX size={14} color={C.red} />Deactivate</> : <><UserCheck size={14} color={C.green} />Activate</>}
            </button>
            <button onClick={() => { onToggleAdmin(); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: C.dim, cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s' }}>
              {user.role === 'admin' ? <><Shield size={14} color={C.muted} />Remove Admin</> : <><ShieldCheck size={14} color={C.purple} />Make Admin</>}
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
    <AdminShell title="User Management">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
        <AlertCircle size={40} color={C.red} />
        <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '16px 0 8px' }}>{error}</p>
        <button onClick={() => router.push('/admin')} style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to admin</button>
      </div>
    </AdminShell>
  );

  const actions = (
    <>
      <div className="usr-search">
        <Search size={13} color={C.muted} />
        <input
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select
        value={orgFilter}
        onChange={(e) => setOrgFilter(e.target.value)}
        className="usr-select"
      >
        <option value="all">All Orgs</option>
        {orgNames.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </>
  );

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell
        title="User Management"
        subtitle={`${users.length} users · ${orgNames.length} organisation${orgNames.length !== 1 ? 's' : ''}`}
        actions={actions}
      >
        <div className="usr-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 size={28} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="usr-empty">
              <Users size={36} style={{ marginBottom: 12, opacity: 0.3, color: C.dim }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: C.dim }}>No users found</p>
            </div>
          ) : (
            <div className="usr-table-wrap">
              <table className="usr-table">
                <thead>
                  <tr>
                    <th>Name / Email</th>
                    <th>Organisation</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Invoices</th>
                    <th>Last Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([org, orgUsers]) => orgUsers.length === 0 ? null : (
                    <>
                      <tr key={`header-${org}`} className="usr-group-header">
                        <td colSpan={7}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accentGlow, border: `1px solid rgba(0,150,199,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Building2 size={12} color={C.accent} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{org}</span>
                            <span style={{ fontSize: 11, color: C.muted, background: C.surfaceHi, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{orgUsers.length}</span>
                          </div>
                        </td>
                      </tr>
                      {orgUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{user.full_name || 'No name'}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{user.email}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: C.dim }}>{user.organisation_name || '—'}</span>
                          </td>
                          <td>
                            <span className="usr-badge" style={{
                              background: user.role === 'admin' ? C.purpleGlow : C.surfaceHi,
                              color: user.role === 'admin' ? C.purple : C.dim,
                              border: `1px solid ${user.role === 'admin' ? 'rgba(168,85,247,0.3)' : C.border}`,
                            }}>
                              {user.role === 'admin' ? <ShieldCheck size={10} /> : <Users size={10} />}
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span className="usr-badge" style={{
                              background: user.is_active ? C.greenGlow : C.redGlow,
                              color: user.is_active ? C.green : C.red,
                              border: `1px solid ${user.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                              {user.is_active ? <UserCheck size={10} /> : <UserX size={10} />}
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <span className="usr-mono" style={{ fontSize: 13 }}>{user.invoice_count}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: C.dim }}>{formatTime(user.last_activity)}</span>
                          </td>
                          <td>
                            <ActionsDropdown
                              user={user}
                              onToggleActive={() => updateUser(user.id, { is_active: !user.is_active })}
                              onToggleAdmin={() => updateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                              isUpdating={updating === user.id}
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminShell>
    </>
  );
}
