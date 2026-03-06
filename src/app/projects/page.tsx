'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, FolderOpen, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  created_at: string;
  invoice_count?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Fetch projects with invoice count
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('user_id', user?.id || '')
        .order('name');

      if (proj) {
        // Get invoice counts per project
        const { data: inv } = await supabase
          .from('invoices')
          .select('project_id')
          .eq('user_id', user?.id || '')
          .not('project_id', 'is', null);

        const counts: Record<string, number> = {};
        (inv || []).forEach(i => { if (i.project_id) counts[i.project_id] = (counts[i.project_id] || 0) + 1; });

        setProjects(proj.map(p => ({ ...p, invoice_count: counts[p.id] || 0 })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('projects').insert({ name: newName.trim(), user_id: user?.id });
      if (error) throw error;
      setNewName(''); setAdding(false);
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from('projects').update({ name: editName.trim(), updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setEditId(null);
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Invoices assigned to it will be unlinked.`)) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0f172a', outline: 'none', background: '#fff',
  };

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Projects</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={15} /> New
        </button>
      </header>

      <main style={{ padding: 16, paddingBottom: 100 }}>

        {error && (
          <div style={{ padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, marginBottom: 12, color: '#be123c', fontSize: 14 }}>{error}</div>
        )}

        {/* Add form */}
        {adding && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #2563eb', padding: 14, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              placeholder="Project name…"
              style={inputStyle}
            />
            <button onClick={handleAdd} disabled={saving || !newName.trim()} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); }} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}><Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : projects.length === 0 && !adding ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <FolderOpen size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>No projects yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Tap New to create your first project</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(project => (
              <div key={project.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 14 }}>
                {editId === project.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(project.id); if (e.key === 'Escape') setEditId(null); }}
                      style={inputStyle}
                    />
                    <button onClick={() => handleEdit(project.id)} disabled={saving} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                    </button>
                    <button onClick={() => setEditId(null)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderOpen size={18} color="#2563eb" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{project.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                        {project.invoice_count || 0} document{project.invoice_count !== 1 ? 's' : ''}
                        {' · '}
                        {new Date(project.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <button onClick={() => { setEditId(project.id); setEditName(project.name); }} style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(project.id, project.name)} style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
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
