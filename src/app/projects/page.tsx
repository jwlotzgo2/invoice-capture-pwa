'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, FolderOpen, Loader2, FileText } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  primary: '#e5e5e5', text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  error: '#fca5a5', errorBg: 'rgba(252,165,165,0.1)', success: '#86efac', successBg: 'rgba(134,239,172,0.1)',
};

interface Project {
  id: string;
  name: string;
  created_at: string;
  invoice_count?: number;
  total_spend?: number;
}

const fmtZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n).replace('ZAR', 'R');

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proj } = await supabase
        .from('projects').select('id, name, created_at')
        .eq('user_id', user?.id || '').order('name');

      if (proj) {
        const { data: inv } = await supabase
          .from('invoices').select('project_id, amount')
          .eq('user_id', user?.id || '').not('project_id', 'is', null);

        const counts: Record<string, number> = {};
        const totals: Record<string, number> = {};
        (inv || []).forEach(i => {
          if (i.project_id) {
            counts[i.project_id] = (counts[i.project_id] || 0) + 1;
            totals[i.project_id] = (totals[i.project_id] || 0) + (i.amount || 0);
          }
        });
        setProjects(proj.map(p => ({ ...p, invoice_count: counts[p.id] || 0, total_spend: totals[p.id] || 0 })));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase.from('projects').insert({ name: newName.trim(), user_id: user?.id });
      if (err) throw err;
      setNewName(''); setAdding(false);
      await fetchProjects();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase.from('projects').update({ name: editName.trim() }).eq('id', id);
      if (err) throw err;
      setEditId(null);
      await fetchProjects();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? Documents will not be deleted.')) return;
    setDeleting(id); setError(null);
    try {
      const { error: err } = await supabase.from('projects').delete().eq('id', id);
      if (err) throw err;
      await fetchProjects();
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(null); }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: T.text,
    outline: 'none', background: T.bg,
  };

  const iconBtnStyle = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 8, border: variant === 'ghost' ? `1px solid ${T.border}` : 'none',
    background: variant === 'primary' ? T.primary : variant === 'danger' ? 'transparent' : 'transparent',
    color: variant === 'primary' ? T.bg : variant === 'danger' ? T.error : T.textDim,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    transition: 'opacity 0.15s',
  });

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text, paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: ${T.primary} !important; }`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/settings')} style={iconBtnStyle('ghost')}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Projects</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); setTimeout(() => document.getElementById('new-project-input')?.focus(), 50); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: T.primary, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={15} /> New
        </button>
      </header>

      <main style={{ padding: 16 }}>
        {error && (
          <div style={{ padding: 12, background: T.errorBg, border: `1px solid ${T.error}`, borderRadius: 8, marginBottom: 12, color: T.error, fontSize: 13 }}>{error}</div>
        )}

        {/* Add new project */}
        {adding && (
          <div style={{ background: T.surface, borderRadius: 12, border: `1.5px solid ${T.primary}`, padding: 14, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              id="new-project-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              placeholder="Project name…"
              style={inputStyle}
            />
            <button onClick={handleAdd} disabled={saving || !newName.trim()} style={iconBtnStyle('primary')}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); }} style={iconBtnStyle('ghost')}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={28} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: T.textMuted }}>
            <FolderOpen size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No projects yet</div>
            <div style={{ fontSize: 13 }}>Tap New to create your first project</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(project => (
              <div key={project.id} style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, padding: 14, transition: 'border-color 0.15s' }}>
                {editId === project.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(project.id); if (e.key === 'Escape') setEditId(null); }}
                      autoFocus
                      style={inputStyle}
                    />
                    <button onClick={() => handleEdit(project.id)} disabled={saving} style={iconBtnStyle('primary')}>
                      {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                    </button>
                    <button onClick={() => setEditId(null)} style={iconBtnStyle('ghost')}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderOpen size={18} color={T.textDim} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, display: 'flex', gap: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={11} />{project.invoice_count} doc{project.invoice_count !== 1 ? 's' : ''}
                        </span>
                        {(project.total_spend || 0) > 0 && (
                          <span style={{ color: T.textDim, fontWeight: 500 }}>{fmtZAR(project.total_spend!)}</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setEditId(project.id); setEditName(project.name); setAdding(false); }} style={iconBtnStyle('ghost')}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(project.id)} disabled={deleting === project.id} style={iconBtnStyle('danger')}>
                        {deleting === project.id ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
