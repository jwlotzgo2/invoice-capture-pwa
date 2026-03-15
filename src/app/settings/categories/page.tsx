'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Plus, Trash2, GripVertical, Check, X } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  blue: '#60a5fa', success: '#86efac', error: '#fca5a5', warning: '#fdba74',
};

const DEFAULT_CATEGORIES = [
  'Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software',
  'Professional Services','Food & Entertainment','Equipment','Marketing','Other',
];

interface Category { id: string; name: string; sort_order: number; }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', session?.user?.id || '')
      .order('sort_order');
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const displayCategories = categories.length > 0 ? categories : [];

  const seedDefaults = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const rows = DEFAULT_CATEGORIES.map((name, i) => ({
      user_id: session?.user?.id, name, sort_order: i,
    }));
    await supabase.from('user_categories').insert(rows);
    await fetch();
    setSaving(false);
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
    await supabase.from('user_categories').insert({
      user_id: session?.user?.id, name, sort_order: maxOrder,
    });
    setNewName('');
    await fetch();
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('user_categories').delete().eq('id', id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!name || !editingId) return;
    await supabase.from('user_categories').update({ name }).eq('id', editingId);
    setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name } : c));
    setEditingId(null);
    setEditingName('');
  };

  const handleDrop = async (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const items = [...categories];
    const fromIdx = items.findIndex(c => c.id === dragging);
    const toIdx = items.findIndex(c => c.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const reordered = items.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(reordered);
    setDragging(null);
    setDragOver(null);
    // Persist new order
    await Promise.all(reordered.map(c =>
      supabase.from('user_categories').update({ sort_order: c.sort_order }).eq('id', c.id)
    ));
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100svh', background: T.bg, color: T.text }}>
      {/* Header */}
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/settings')}
          style={{ width: 34, height: 34, border: `1px solid ${T.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', color: T.textDim }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Categories</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Manage your invoice categories</div>
        </div>
        <div style={{ fontSize: 11, color: T.textMuted }}>{categories.length} categories</div>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 100px' }}>

        {/* Add new */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Add Category</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()}
              placeholder="e.g. Insurance, Rent, Legal..."
              style={{ flex: 1, padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: T.text, background: T.bg, outline: 'none' }}
            />
            <button onClick={addCategory} disabled={!newName.trim() || saving}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newName.trim() ? T.blue : T.border, color: newName.trim() ? '#0f172a' : T.textMuted, fontSize: 13, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Categories</span>
            {categories.length === 0 && !loading && (
              <button onClick={seedDefaults} disabled={saving}
                style={{ fontSize: 11, color: T.blue, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Load defaults
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Loading…</div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 12 }}>No categories yet</div>
              <button onClick={seedDefaults}
                style={{ fontSize: 13, color: T.blue, background: 'rgba(96,165,250,0.1)', border: `1px solid rgba(96,165,250,0.3)`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Load default categories
              </button>
            </div>
          ) : (
            displayCategories.map((cat, idx) => (
              <div key={cat.id}
                draggable
                onDragStart={() => setDragging(cat.id)}
                onDragOver={e => { e.preventDefault(); setDragOver(cat.id); }}
                onDrop={() => handleDrop(cat.id)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px',
                  borderBottom: idx < categories.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: dragOver === cat.id ? T.surfaceHigh : dragging === cat.id ? 'rgba(96,165,250,0.06)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                {/* Drag handle */}
                <div style={{ color: T.textMuted, cursor: 'grab', flexShrink: 0, display: 'flex' }}>
                  <GripVertical size={16} />
                </div>

                {/* Name / edit */}
                {editingId === cat.id ? (
                  <input
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    style={{ flex: 1, padding: '5px 8px', border: `1px solid ${T.blue}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', color: T.text, background: T.bg, outline: 'none' }}
                  />
                ) : (
                  <span
                    onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                    style={{ flex: 1, fontSize: 14, color: T.text, cursor: 'pointer' }}>
                    {cat.name}
                  </span>
                )}

                {/* Edit actions */}
                {editingId === cat.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveEdit} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(134,239,172,0.15)', color: T.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: T.surfaceHigh, color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => deleteCategory(cat.id)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.error)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {categories.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            Drag to reorder · Tap name to rename
          </div>
        )}
      </div>
    </div>
  );
}
