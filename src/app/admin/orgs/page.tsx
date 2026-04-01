'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Pencil, Check, X, Copy, Loader2, Users, RefreshCw, Building2 } from 'lucide-react';
import AdminShell from '@/components/AdminShell';

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
  text:         '#d4e5f5',
  dim:          '#6890b0',
  muted:        '#2d4a65',
};

const pageCss = `
  .orgs-layout {
    display: flex;
    height: calc(100vh - 52px);
    overflow: hidden;
  }
  @media (max-width: 768px) {
    .orgs-layout { flex-direction: column; height: auto; overflow: visible; }
    .orgs-left { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border}; max-height: 300px; overflow-y: auto; }
    .orgs-right { flex: 1; }
  }

  .orgs-left {
    width: 380px;
    flex-shrink: 0;
    border-right: 1px solid ${C.border};
    overflow-y: auto;
    background: ${C.bg};
    display: flex;
    flex-direction: column;
  }

  .orgs-left-header {
    padding: 14px 16px;
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: ${C.surface};
    flex-shrink: 0;
  }

  .orgs-right {
    flex: 1;
    overflow-y: auto;
    background: ${C.bg};
  }

  .org-list-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${C.border};
    cursor: pointer;
    transition: background 0.12s;
  }
  .org-list-row:hover { background: ${C.surfaceHi}; }
  .org-list-row.selected { background: ${C.accentGlow}; border-left: 2px solid ${C.accent}; }

  .org-detail-panel { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

  .od-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 10px;
    overflow: hidden;
  }
  .od-card-header {
    padding: 12px 16px;
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: ${C.surfaceHi};
  }
  .od-card-title {
    font-size: 10px; font-weight: 700; color: ${C.muted};
    text-transform: uppercase; letter-spacing: 1px;
  }

  .od-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid ${C.border};
  }
  .od-row:last-child { border-bottom: none; }

  .od-member-row {
    display: flex; align-items: center; gap: 10px; padding: 10px 16px;
    border-bottom: 1px solid ${C.border};
    transition: background 0.12s;
  }
  .od-member-row:hover { background: ${C.surfaceHi}; }
  .od-member-row:last-child { border-bottom: none; }

  .od-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
    border: 1px solid ${C.border}; background: ${C.surfaceHi}; color: ${C.dim};
    cursor: pointer; font-family: 'IBM Plex Sans', system-ui, sans-serif; transition: border-color 0.14s, color 0.14s;
  }
  .od-btn:hover { border-color: ${C.borderHi}; color: ${C.text}; }
  .od-btn-primary { background: ${C.accent}; border-color: ${C.accent}; color: #fff; }
  .od-btn-primary:hover { background: ${C.accentBright}; border-color: ${C.accentBright}; color: ${C.bg}; }
  .od-btn-danger { border-color: rgba(239,68,68,0.3); color: ${C.red}; }
  .od-btn-danger:hover { background: ${C.redGlow}; border-color: ${C.red}; }

  .od-input {
    flex: 1; padding: 8px 12px; border: 1px solid ${C.border}; border-radius: 7px;
    font-size: 13px; font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.text};
    background: ${C.bg}; outline: none; transition: border-color 0.15s;
  }
  .od-input:focus { border-color: ${C.accent}; }

  .od-code {
    font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700;
    letter-spacing: 3px; color: ${C.accentBright};
  }

  .od-select {
    padding: 6px 10px; border: 1px solid ${C.border}; border-radius: 6px; font-size: 12px;
    font-family: 'IBM Plex Sans', system-ui, sans-serif; color: ${C.text}; outline: none;
    background: ${C.bg}; cursor: pointer;
  }

  .od-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 80px 24px; color: ${C.muted}; text-align: center;
  }

  .od-add-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 7px; border: none;
    background: ${C.accent}; color: #fff; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }
  .od-add-btn:hover { background: ${C.accentBright}; color: ${C.bg}; }

  .od-badge {
    display: inline-flex; align-items: center; padding: 2px 8px;
    border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
  }
`;

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

  const selectedOrg = expandedOrg ? orgs.find(o => o.id === expandedOrg) : null;
  const selectedMembers = selectedOrg ? orgMembers(selectedOrg.id) : [];

  const newOrgBtn = (
    <button
      className="od-add-btn"
      onClick={() => { setAdding(true); setEditId(null); setTimeout(() => document.getElementById('new-org-input')?.focus(), 50); }}
    >
      <Plus size={14} /> New org
    </button>
  );

  return (
    <>
      <style>{pageCss}</style>
      <AdminShell title="Organisations" subtitle={`${orgs.length} orgs · ${users.length} users`} actions={newOrgBtn}>
        {error && (
          <div style={{ padding: '10px 16px', background: C.redGlow, borderBottom: `1px solid ${C.red}`, color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div className="orgs-layout">
          {/* Left panel: org list */}
          <div className="orgs-left">
            <div className="orgs-left-header">
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {orgs.length} Organisation{orgs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Add new org inline */}
            {adding && (
              <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, background: C.surfaceHi, display: 'flex', gap: 8 }}>
                <input
                  id="new-org-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                  placeholder="Organisation name…"
                  className="od-input"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAdd} disabled={saving || !newName.trim()} style={{ width: 32, height: 32, borderRadius: 7, border: 'none', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                </button>
                <button onClick={() => { setAdding(false); setNewName(''); }} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={24} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : orgs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: C.muted }}>
                <Building2 size={30} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No organisations yet</div>
              </div>
            ) : (
              orgs.map(org => (
                <div
                  key={org.id}
                  className={`org-list-row${expandedOrg === org.id ? ' selected' : ''}`}
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: org.is_active ? C.accentGlow : C.surfaceHi, border: `1px solid ${org.is_active ? 'rgba(0,150,199,0.2)' : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={15} color={org.is_active ? C.accent : C.muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: org.is_active ? C.text : C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {org.org_code && (
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.dim, letterSpacing: 1 }}>{org.org_code}</span>
                      )}
                      <span style={{ fontSize: 11, color: C.muted }}>{org.member_count} member{org.member_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="od-badge" style={{
                    background: org.is_active ? C.greenGlow : C.surfaceHi,
                    color: org.is_active ? C.green : C.muted,
                    border: `1px solid ${org.is_active ? 'rgba(16,185,129,0.3)' : C.border}`,
                  }}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Right panel: selected org detail */}
          <div className="orgs-right">
            {!selectedOrg ? (
              <div className="od-empty">
                <Building2 size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: C.dim, marginBottom: 6 }}>Select an organisation</div>
                <div style={{ fontSize: 13, color: C.muted }}>Click an org on the left to view details</div>
              </div>
            ) : (
              <div className="org-detail-panel">

                {/* Name + edit */}
                <div className="od-card">
                  <div className="od-card-header">
                    <span className="od-card-title">Organisation Details</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {editId !== selectedOrg.id && (
                        <button onClick={() => { setEditId(selectedOrg.id); setEditName(selectedOrg.name); }} className="od-btn">
                          <Pencil size={12} /> Rename
                        </button>
                      )}
                      <button onClick={() => handleToggleActive(selectedOrg)} className="od-btn" style={{ color: selectedOrg.is_active ? C.amber : C.green }}>
                        {selectedOrg.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {editId === selectedOrg.id ? (
                    <div className="od-row">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEdit(selectedOrg.id); if (e.key === 'Escape') setEditId(null); }}
                        autoFocus
                        className="od-input"
                      />
                      <button onClick={() => handleEdit(selectedOrg.id)} disabled={saving} style={{ width: 32, height: 32, borderRadius: 7, border: 'none', background: C.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={13} />}
                      </button>
                      <button onClick={() => setEditId(null)} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="od-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Name</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selectedOrg.name}</div>
                      </div>
                    </div>
                  )}

                  {/* Org code */}
                  <div className="od-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Invite Code</div>
                      {selectedOrg.org_code ? (
                        <span className="od-code">{selectedOrg.org_code}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>No code generated</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {selectedOrg.org_code && (
                        <button
                          onClick={() => handleCopyCode(selectedOrg.org_code!, selectedOrg.id)}
                          className="od-btn"
                          style={{ color: copiedCode === selectedOrg.id ? C.green : C.dim }}
                        >
                          {copiedCode === selectedOrg.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedCode === selectedOrg.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                      <button onClick={() => generateCode(selectedOrg.id)} disabled={saving} className="od-btn">
                        {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                        {selectedOrg.org_code ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Members table */}
                <div className="od-card">
                  <div className="od-card-header">
                    <span className="od-card-title">Members ({selectedMembers.length})</span>
                  </div>
                  {selectedMembers.length === 0 ? (
                    <div style={{ padding: '20px 16px', fontSize: 13, color: C.muted }}>
                      No members yet — share the invite code above
                    </div>
                  ) : (
                    selectedMembers.map(user => (
                      <div key={user.id} className="od-member-row">
                        <div style={{ width: 32, height: 32, borderRadius: 7, background: C.accentGlow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{user.email} · {user.role}</div>
                        </div>
                        <button
                          onClick={() => handleAssignUser(user.id, null, selectedOrg.id)}
                          disabled={assigningUser === user.id}
                          className="od-btn od-btn-danger"
                        >
                          {assigningUser === user.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={11} />}
                          Remove
                        </button>
                      </div>
                    ))
                  )}

                  {/* Add unassigned user */}
                  {unassigned.length > 0 && (
                    <>
                      <div style={{ padding: '10px 16px 6px', borderTop: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Add Unassigned User
                      </div>
                      {unassigned.map(user => (
                        <div key={user.id} className="od-member-row" style={{ opacity: 0.8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 7, background: C.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.dim, flexShrink: 0 }}>
                            {(user.full_name || user.email || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name || user.email}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{user.email}</div>
                          </div>
                          <button
                            onClick={() => handleAssignUser(user.id, selectedOrg.id)}
                            disabled={assigningUser === user.id}
                            className="od-btn od-btn-primary"
                          >
                            {assigningUser === user.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={11} />}
                            Add
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </AdminShell>
    </>
  );
}
