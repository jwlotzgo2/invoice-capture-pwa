'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Copy, Loader2, Users, RefreshCw, Building2 } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  primary: '#e5e5e5', text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  error: '#fca5a5', errorBg: 'rgba(252,165,165,0.1)',
  success: '#86efac', successBg: 'rgba(134,239,172,0.1)',
};

interface Org {
  id: string;
  name: string;
  org_code: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

interface OrgMember {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
  });
}

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: orgData }, { data: userData }] = await Promise.all([
        supabase.from('organisations').select('id,name,org_code,is_active,created_at').order('name'),
        supabase.from('user_profiles').select('id,email,full_name,role,org_id').order('email'),
      ]);

      const counts: Record<string, number> = {};
      (userData || []).forEach(u => { if (u.org_id) counts[u.org_id] = (counts[u.org_id] || 0) + 1; });
      setOrgs((orgData || []).map(o => ({ ...o, member_count: counts[o.id] || 0 })));
      setUsers(userData || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const generateCode = async (orgId: string) => {
    setSaving(true);
    try {
      const { data: code } = await supabase.rpc('generate_org_code');
      const { error: err } = await supabase.from('organisations').update({ org_code: code }).eq('id', orgId);
      if (err) throw err;
      await fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { data: code } = await supabase.rpc('generate_org_code');
      const { error: err } = await supabase.from('organisations').insert({ name: newName.trim(), org_code: code, is_active: true });
      if (err) throw err;
      setNewName(''); setAdding(false);
      await fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase.from('organisations').update({ name: editName.trim() }).eq('id', id);
      if (err) throw err;
      setEditId(null); await fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (org: Org) => {
    const { error: err } = await supabase.from('organisations').update({ is_active: !org.is_active }).eq('id', org.id);
    if (err) setError(err.message);
    else await fetchData();
  };

  const handleAssignUser = async (userId: string, orgId: string | null, currentOrgId?: string | null) => {
    setAssigningUser(userId);
    setError(null);
    try {
      if (orgId) {
        // Add user to the specified org
        const res = await fetch(`/api/admin/orgs/${orgId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed to add member'); }
      } else if (currentOrgId) {
        // Remove user from their current org
        const res = await fetch(`/api/admin/orgs/${currentOrgId}/members`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed to remove member'); }
      }
      await fetchData();
    } catch (e: any) { setError(e.message); }
    setAssigningUser(null);
  };

  const handleCopyCode = (code: string, orgId: string) => {
    copyText(code);
    setCopiedCode(orgId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const orgMembers = (orgId: string) => users.filter(u => u.org_id === orgId);
  const unassigned = users.filter(u => !u.org_id);

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: T.text,
    background: T.bg, outline: 'none',
  };

  const iconBtn = (variant: 'primary' | 'ghost' | 'danger' = 'ghost'): React.CSSProperties => ({
    width: 32, height: 32, borderRadius: 8,
    border: variant === 'ghost' ? `1px solid ${T.border}` : 'none',
    background: variant === 'primary' ? T.primary : 'transparent',
    color: variant === 'primary' ? T.bg : variant === 'danger' ? T.error : T.textDim,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  });

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text, paddingBottom: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus, select:focus { outline: none; border-color: ${T.primary} !important; }`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/admin')} style={iconBtn()}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Organisations</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{orgs.length} orgs · {users.length} users</div>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); setTimeout(() => document.getElementById('new-org-input')?.focus(), 50); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: T.primary, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={14} /> New org
        </button>
      </header>

      <main style={{ padding: 16, maxWidth: 680, margin: '0 auto' }}>
        {error && (
          <div style={{ padding: 12, background: T.errorBg, border: `1px solid ${T.error}`, borderRadius: 8, marginBottom: 12, color: T.error, fontSize: 13 }}>{error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: T.error, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Add new org */}
        {adding && (
          <div style={{ background: T.surface, borderRadius: 12, border: `1.5px solid ${T.primary}`, padding: 14, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input id="new-org-input" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              placeholder="Organisation name…" style={inputStyle} />
            <button onClick={handleAdd} disabled={saving || !newName.trim()} style={iconBtn('primary')}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); }} style={iconBtn()}>
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={28} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Org list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {orgs.map(org => (
                <div key={org.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                  {/* Org header row */}
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={17} color={org.is_active ? T.textDim : T.textMuted} />
                    </div>

                    {editId === org.id ? (
                      <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEdit(org.id); if (e.key === 'Escape') setEditId(null); }}
                          autoFocus style={inputStyle} />
                        <button onClick={() => handleEdit(org.id)} disabled={saving} style={iconBtn('primary')}>
                          {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                        </button>
                        <button onClick={() => setEditId(null)} style={iconBtn()}><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: org.is_active ? T.text : T.textMuted }}>{org.name}</span>
                            {!org.is_active && <span style={{ fontSize: 10, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 5px' }}>inactive</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            {/* Org code */}
                            {org.org_code ? (
                              <button
                                onClick={() => handleCopyCode(org.org_code!, org.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surfaceHigh, color: T.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}>
                                {copiedCode === org.id ? <Check size={11} color={T.success} /> : <Copy size={11} />}
                                {org.org_code}
                              </button>
                            ) : (
                              <button onClick={() => generateCode(org.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, border: `1px dashed ${T.border}`, background: 'transparent', color: T.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                <RefreshCw size={10} /> Generate code
                              </button>
                            )}
                            <span style={{ fontSize: 11, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Users size={10} />{org.member_count} member{org.member_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          {org.org_code && (
                            <button onClick={() => generateCode(org.id)} style={iconBtn()} title="Regenerate code">
                              <RefreshCw size={13} />
                            </button>
                          )}
                          <button onClick={() => { setEditId(org.id); setEditName(org.name); }} style={iconBtn()} title="Rename">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleToggleActive(org)} style={iconBtn()} title={org.is_active ? 'Deactivate' : 'Activate'}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: org.is_active ? T.success : T.textMuted }}>{org.is_active ? 'ON' : 'OFF'}</span>
                          </button>
                          <button onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)} style={iconBtn()} title="Manage members">
                            <Users size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Members panel */}
                  {expandedOrg === org.id && (
                    <div style={{ borderTop: `1px solid ${T.border}`, padding: 14, background: T.bg }}>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Members</div>
                      {orgMembers(org.id).length === 0 ? (
                        <div style={{ fontSize: 13, color: T.textMuted, padding: '8px 0' }}>No members yet — share the org code above</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                          {orgMembers(org.id).map(user => (
                            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: T.surface, borderRadius: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
                                <div style={{ fontSize: 11, color: T.textMuted }}>{user.email} · {user.role}</div>
                              </div>
                              <button onClick={() => handleAssignUser(user.id, null, org.id)} style={iconBtn('danger')} title="Remove from org" disabled={assigningUser === user.id}>
                                {assigningUser === user.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Assign unassigned users */}
                      {unassigned.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, marginTop: 4 }}>Add unassigned user</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {unassigned.map(user => (
                              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: T.surface, borderRadius: 8, opacity: 0.7 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
                                  <div style={{ fontSize: 11, color: T.textMuted }}>{user.email}</div>
                                </div>
                                <button onClick={() => handleAssignUser(user.id, org.id)} disabled={assigningUser === user.id}
                                  style={{ ...iconBtn('primary'), width: 'auto', padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                                  {assigningUser === user.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : '+ Add'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {orgs.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: T.textMuted }}>
                  <Building2 size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No organisations yet</div>
                  <div style={{ fontSize: 13 }}>Tap New org to create one</div>
                </div>
              )}
            </div>

            {/* Unassigned users summary */}
            {unassigned.length > 0 && (
              <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: 14 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unassigned users ({unassigned.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {unassigned.map(user => (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>{user.email}</div>
                      </div>
                      {orgs.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={e => e.target.value && handleAssignUser(user.id, e.target.value, null)}
                          style={{ padding: '5px 8px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textDim, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
                          <option value="">Assign to org…</option>
                          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
