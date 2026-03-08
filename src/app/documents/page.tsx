'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Search, Grid, List, Download, FileText, Image as ImageIcon,
  X, Link2, Check, ChevronDown, SlidersHorizontal, FolderOpen, Archive,
  Eye, Calendar, Building2, Tag, Loader2,
} from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  primary: '#e5e5e5', text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
  selectedBorder: '#e5e5e5', selectedBg: 'rgba(229,229,229,0.06)',
};

interface Doc {
  id: string;
  supplier: string | null;
  description: string | null;
  invoice_date: string | null;
  amount: number | null;
  document_number: string | null;
  image_url: string | null;
  image_path: string | null;
  project_id: string | null;
  created_at: string;
  source?: string;
}

interface Project { id: string; name: string; }

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtZAR = (n: number | null) => n == null ? '' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(n).replace('ZAR', 'R');
const isPdf = (doc: Doc) => doc.image_url?.toLowerCase().includes('.pdf') || doc.image_path?.toLowerCase().endsWith('.pdf');

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
  });
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'invoice_date' | 'amount' | 'supplier'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Doc | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      const [{ data: invData }, { data: projData }] = await Promise.all([
        supabase.from('invoices').select('id,supplier,description,invoice_date,amount,document_number,image_url,image_path,project_id,created_at,source')
          .eq('user_id', user?.id || '').order(sortBy, { ascending: sortDir === 'asc' }),
        supabase.from('projects').select('id,name').eq('user_id', user?.id || ''),
      ]);
      setDocs(invData || []);
      setProjects(projData || []);
    } finally { setLoading(false); }
  }, [supabase, sortBy, sortDir]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Close preview on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const filtered = docs.filter(d => {
    if (search) {
      const q = search.toLowerCase();
      if (!(d.supplier || '').toLowerCase().includes(q) &&
          !(d.description || '').toLowerCase().includes(q) &&
          !(d.document_number || '').toLowerCase().includes(q)) return false;
    }
    if (filterSupplier && !(d.supplier || '').toLowerCase().includes(filterSupplier.toLowerCase())) return false;
    if (filterProject && d.project_id !== filterProject) return false;
    if (filterDateFrom && d.invoice_date && d.invoice_date < filterDateFrom) return false;
    if (filterDateTo && d.invoice_date && d.invoice_date > filterDateTo) return false;
    return true;
  });

  const suppliers = [...new Set(docs.map(d => d.supplier).filter(Boolean))] as string[];
  const activeFilters = [filterSupplier, filterProject, filterDateFrom, filterDateTo].filter(Boolean).length;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  };

  const handleDownload = (doc: Doc) => {
    if (!doc.image_url) return;
    const a = document.createElement('a');
    a.href = doc.image_url;
    a.download = doc.document_number || doc.supplier || 'document';
    a.target = '_blank';
    a.click();
  };

  const handleShare = (doc: Doc) => {
    if (!doc.image_url) return;
    copyToClipboard(doc.image_url);
    setCopiedId(doc.id);
    showToast('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleZipDownload = async () => {
    const selectedDocs = filtered.filter(d => selected.has(d.id) && d.image_url);
    if (!selectedDocs.length) return;
    setZipping(true);
    try {
      // Download files individually with a small delay between each
      for (const doc of selectedDocs) {
        const ext = doc.image_url!.split('.').pop()?.split('?')[0] || 'pdf';
        const name = `${doc.supplier || 'doc'}-${doc.document_number || doc.id.slice(0, 8)}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_');
        const a = document.createElement('a');
        a.href = doc.image_url!; a.download = name; a.target = '_blank'; a.click();
        await new Promise(r => setTimeout(r, 300));
      }
      showToast(`Downloading ${selectedDocs.length} files`);
    } catch (e) {
      showToast('Download failed — try downloading individually');
    } finally { setZipping(false); }
  };

  const clearFilters = () => { setFilterSupplier(''); setFilterProject(''); setFilterDateFrom(''); setFilterDateTo(''); setSearch(''); };

  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || null;

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text, paddingBottom: 80 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: ${T.primary} !important; }
        .doc-card { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; cursor: pointer; transition: border-color 0.15s, background 0.15s; overflow: hidden; animation: fadeIn 0.2s ease; }
        .doc-card:hover { border-color: ${T.textMuted}; }
        .doc-card.sel { border-color: ${T.selectedBorder}; background: ${T.selectedBg}; }
        .doc-row { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; cursor: pointer; transition: border-color 0.15s; display: flex; align-items: center; gap: 12px; padding: 12px 14px; animation: fadeIn 0.15s ease; }
        .doc-row:hover { border-color: ${T.textMuted}; }
        .doc-row.sel { border-color: ${T.selectedBorder}; background: ${T.selectedBg}; }
        .filter-panel { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 16px; margin-bottom: 12px; animation: slideUp 0.2s ease; }
        .preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; flex-direction: column; }
        .preview-header { background: ${T.surface}; border-bottom: 1px solid ${T.border}; padding: 12px 16px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .preview-body { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .toast { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: ${T.surfaceHigh}; border: 1px solid ${T.border}; color: ${T.text}; padding: 10px 18px; border-radius: 20px; font-size: 13px; z-index: 200; white-space: nowrap; animation: fadeIn 0.2s ease; }
        .thumb { width: 100%; aspect-ratio: 4/3; background: ${T.surfaceHigh}; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumb iframe { width: 100%; height: 100%; border: none; pointer-events: none; }
        .cb { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid ${T.border}; background: transparent; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.1s; }
        .cb.checked { background: ${T.primary}; border-color: ${T.primary}; }
        .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${T.border}; background: transparent; color: ${T.textDim}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .icon-btn:hover { border-color: ${T.textMuted}; color: ${T.text}; }
        .sort-btn { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; border: 1px solid ${T.border}; background: transparent; color: ${T.textDim}; font-size: 12px; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .sort-btn:hover { border-color: ${T.textMuted}; color: ${T.text}; }
        select option { background: ${T.surface}; color: ${T.text}; }
      `}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} className="icon-btn" style={{ border: 'none' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Documents</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{filtered.length} of {docs.length}</div>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', background: T.bg, borderRadius: 8, padding: 3, gap: 2 }}>
          <button onClick={() => setView('grid')} style={{ width: 30, height: 28, borderRadius: 6, border: 'none', background: view === 'grid' ? T.surfaceHigh : 'transparent', color: view === 'grid' ? T.text : T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Grid size={14} />
          </button>
          <button onClick={() => setView('list')} style={{ width: 30, height: 28, borderRadius: 6, border: 'none', background: view === 'list' ? T.surfaceHigh : 'transparent', color: view === 'list' ? T.text : T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <List size={14} />
          </button>
        </div>
        <button onClick={() => setShowFilters(f => !f)} className="icon-btn" style={{ position: 'relative' }}>
          <SlidersHorizontal size={16} />
          {activeFilters > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, background: T.primary, color: T.bg, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${T.surface}` }}>{activeFilters}</span>
          )}
        </button>
      </header>

      <main style={{ padding: 16 }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search supplier, description, document number…"
            style={{ width: '100%', padding: '9px 12px 9px 36px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontFamily: 'inherit' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="filter-panel">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {/* Supplier */}
              <div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={10} />Supplier</div>
                <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: filterSupplier ? T.text : T.textMuted, fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="">All suppliers</option>
                  {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Project */}
              <div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><FolderOpen size={10} />Project</div>
                <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: filterProject ? T.text : T.textMuted, fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="">All projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* Date from */}
              <div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} />From</div>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: filterDateFrom ? T.text : T.textMuted, fontSize: 13, fontFamily: 'inherit', colorScheme: 'dark' }} />
              </div>
              {/* Date to */}
              <div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>To</div>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: filterDateTo ? T.text : T.textMuted, fontSize: 13, fontFamily: 'inherit', colorScheme: 'dark' }} />
              </div>
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ fontSize: 12, color: T.error, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Toolbar: sort + bulk actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {/* Select all checkbox */}
          <div className={`cb ${selected.size === filtered.length && filtered.length > 0 ? 'checked' : ''}`}
            onClick={toggleAll} style={{ cursor: 'pointer' }}>
            {selected.size === filtered.length && filtered.length > 0 && <Check size={11} color={T.bg} strokeWidth={3} />}
          </div>

          {selected.size > 0 ? (
            <>
              <span style={{ fontSize: 12, color: T.textDim, flex: 1 }}>{selected.size} selected</span>
              <button onClick={handleZipDownload} disabled={zipping}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: T.primary, color: T.bg, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {zipping ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                Download ZIP
              </button>
              <button onClick={() => setSelected(new Set())}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <X size={12} /> Clear
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12, color: T.textMuted, flex: 1 }}>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</span>
              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                style={{ padding: '5px 8px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textDim, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="created_at">Date added</option>
                <option value="invoice_date">Invoice date</option>
                <option value="amount">Amount</option>
                <option value="supplier">Supplier</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="icon-btn" title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}>
                <ChevronDown size={14} style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={28} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: T.textMuted }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No documents found</div>
            <div style={{ fontSize: 13 }}>{activeFilters > 0 || search ? 'Try adjusting your filters' : 'Capture your first invoice to get started'}</div>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {filtered.map(doc => (
              <div key={doc.id} className={`doc-card ${selected.has(doc.id) ? 'sel' : ''}`}>
                {/* Thumbnail */}
                <div className="thumb" onClick={() => setPreview(doc)}>
                  {doc.image_url ? (
                    isPdf(doc)
                      ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: T.textMuted }}><FileText size={28} /><span style={{ fontSize: 10 }}>PDF</span></div>
                      : <img src={doc.image_url} alt="" loading="lazy" />
                  ) : (
                    <FileText size={28} color={T.textMuted} />
                  )}
                </div>
                {/* Card footer */}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <div className={`cb ${selected.has(doc.id) ? 'checked' : ''}`} onClick={() => toggleSelect(doc.id)} style={{ cursor: 'pointer', marginTop: 1, flexShrink: 0 }}>
                      {selected.has(doc.id) && <Check size={10} color={T.bg} strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.supplier || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{fmtDate(doc.invoice_date || doc.created_at)}</div>
                      {doc.amount != null && <div style={{ fontSize: 11, color: T.textDim, fontWeight: 500, marginTop: 1 }}>{fmtZAR(doc.amount)}</div>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button onClick={() => setPreview(doc)} className="icon-btn" style={{ flex: 1, width: 'auto' }} title="Preview"><Eye size={13} /></button>
                    <button onClick={() => handleDownload(doc)} className="icon-btn" style={{ flex: 1, width: 'auto' }} title="Download"><Download size={13} /></button>
                    <button onClick={() => handleShare(doc)} className="icon-btn" style={{ flex: 1, width: 'auto' }} title="Copy link">
                      {copiedId === doc.id ? <Check size={13} color={T.success} /> : <Link2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(doc => (
              <div key={doc.id} className={`doc-row ${selected.has(doc.id) ? 'sel' : ''}`}>
                {/* Checkbox */}
                <div className={`cb ${selected.has(doc.id) ? 'checked' : ''}`} onClick={() => toggleSelect(doc.id)} style={{ cursor: 'pointer' }}>
                  {selected.has(doc.id) && <Check size={10} color={T.bg} strokeWidth={3} />}
                </div>
                {/* File icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPdf(doc) ? <FileText size={16} color={T.textDim} /> : <ImageIcon size={16} color={T.textDim} />}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => setPreview(doc)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.supplier || 'Unknown supplier'}
                    {doc.document_number && <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>#{doc.document_number}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 8, marginTop: 2 }}>
                    <span>{fmtDate(doc.invoice_date || doc.created_at)}</span>
                    {doc.amount != null && <span style={{ color: T.textDim, fontWeight: 500 }}>{fmtZAR(doc.amount)}</span>}
                    {doc.project_id && projName(doc.project_id) && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Tag size={9} />{projName(doc.project_id)}</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setPreview(doc)} className="icon-btn" title="Preview"><Eye size={14} /></button>
                  <button onClick={() => handleDownload(doc)} className="icon-btn" title="Download"><Download size={14} /></button>
                  <button onClick={() => handleShare(doc)} className="icon-btn" title="Copy link">
                    {copiedId === doc.id ? <Check size={14} color={T.success} /> : <Link2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Preview overlay */}
      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-header" onClick={e => e.stopPropagation()}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.supplier || 'Unknown supplier'}</div>
              <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 8, marginTop: 2 }}>
                <span>{fmtDate(preview.invoice_date)}</span>
                {preview.amount != null && <span>{fmtZAR(preview.amount)}</span>}
                {preview.document_number && <span>#{preview.document_number}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleDownload(preview)} className="icon-btn" title="Download"><Download size={16} /></button>
              <button onClick={() => handleShare(preview)} className="icon-btn" title="Copy link">
                {copiedId === preview.id ? <Check size={16} color={T.success} /> : <Link2 size={16} />}
              </button>
              <button onClick={() => router.push(`/invoices/${preview.id}`)} className="icon-btn" title="Open detail"><FileText size={16} /></button>
              <button onClick={() => setPreview(null)} className="icon-btn"><X size={16} /></button>
            </div>
          </div>
          <div className="preview-body" onClick={e => e.stopPropagation()}>
            {preview.image_url ? (
              isPdf(preview) ? (
                <iframe src={preview.image_url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }} title="Document preview" />
              ) : (
                <img src={preview.image_url} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
              )
            ) : (
              <div style={{ color: T.textMuted, textAlign: 'center' }}>
                <FileText size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div>No file available</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
