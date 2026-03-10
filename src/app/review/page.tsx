'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFormData, InvoiceCategory, LineItem } from '@/types/invoice';
import { Search, X, ZoomIn, ZoomOut, RotateCcw, ChevronRight, AlertCircle, Loader2, CheckCircle, ScanLine } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
};

const CATEGORIES: InvoiceCategory[] = [
  'Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software',
  'Professional Services','Food & Entertainment','Equipment','Marketing','Other',
];

const fmtZAR = (n:number|null|undefined)=>n!=null?`R ${Math.round(n).toLocaleString('en-ZA')}`:null;

function findDuplicate(inv: Invoice, all: Invoice[]): Invoice | null {
  return all.find(other => {
    if (other.id === inv.id) return false;
    const aRef = inv.document_number?.trim().toLowerCase() || '';
    const bRef = other.document_number?.trim().toLowerCase() || '';
    const sameRef = aRef.length >= 3 && bRef.length >= 3 && aRef === bRef;
    const aSupplier = inv.supplier?.trim().toLowerCase() || '';
    const bSupplier = other.supplier?.trim().toLowerCase() || '';
    const sameSupplier = aSupplier.length > 0 && aSupplier === bSupplier;
    const sameRefAndSupplier = aRef.length >= 3 && bRef.length >= 3 && aRef === bRef && sameSupplier;
    const sameRefOnly = aRef.length >= 6 && bRef.length >= 6 && aRef === bRef;
    const sameCombo =
      sameSupplier &&
      inv.amount != null && other.amount != null && Math.round(inv.amount * 100) === Math.round(other.amount * 100) &&
      inv.invoice_date && other.invoice_date && inv.invoice_date === other.invoice_date;
    return !!(sameRefAndSupplier || sameRefOnly || sameCombo);
  }) ?? null;
}

function getMatchStatus(inv: Invoice): 'match' | 'off' | 'none' {
  const items = Array.isArray(inv.line_items) ? inv.line_items : [];
  if (items.length === 0) return 'none';
  const itemsTotal = items.reduce((s: number, i: any) => s + (i.line_total ?? 0), 0);
  if (!inv.amount) return 'none';
  const exclTotal = inv.amount - (inv.vat_amount ?? 0);
  return Math.abs(Math.round(itemsTotal * 100) - Math.round(exclTotal * 100)) < 2 ? 'match' : 'off';
}

const css = `
  * { box-sizing:border-box; }
  html,body { margin:0;background:${T.bg};height:100%; }
  .review-layout { display:flex;flex-direction:column;height:100svh;background:${T.bg};font-family:Inter, system-ui, sans-serif,Inter, system-ui, sans-serif;color:${T.text}; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);pointer-events:none;z-index:1000; }
  .review-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:12px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .review-title { font-family:Inter, system-ui, sans-serif;font-size:22px;color:${T.yellow};text-shadow:0 0 10px rgba(229,229,229,0.12);flex:1; }
  .review-body { flex:1;display:flex;overflow:hidden; }

  /* LEFT PANEL — fixed 240px */
  .left-panel { width:360px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid ${T.border};background:${T.surface};overflow:hidden; }
  .left-search { padding:10px;border-bottom:1px solid ${T.border}; }
  .left-search-inner { display:flex;align-items:center;gap:8px;background:${T.bg};border:1px solid ${T.border};border-radius:6px;padding:8px 10px; }
  .left-search-inner input { flex:1;border:none;background:transparent;outline:none;font-size:12px;font-family:Inter, system-ui, sans-serif;color:${T.text}; }
  .left-search-inner input::placeholder { color:${T.textMuted}; }
  .filter-chips { display:flex;flex-wrap:wrap;gap:5px;padding:8px 10px;border-bottom:1px solid ${T.border}; }
  .fchip { padding:3px 9px;border-radius:4px;border:1px solid ${T.border};background:transparent;font-size:10px;color:${T.textDim};cursor:pointer;font-family:Inter, system-ui, sans-serif;letter-spacing:0.2px;text-transform:none;transition:all 0.15s;white-space:nowrap; }
  .fchip.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .fchip.orange.active { border-color:${T.warning};background:rgba(253,186,116,0.12);color:${T.warning}; }
  .left-count { padding:6px 10px;font-size:10px;color:${T.textMuted};letter-spacing:0.2px;border-bottom:1px solid ${T.border}; }
  .left-list { flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${T.border} transparent; }
  .left-list::-webkit-scrollbar { width:4px; }
  .left-list::-webkit-scrollbar-thumb { background:${T.border};border-radius:2px; }
  .inv-row { padding:12px 10px;border-bottom:1px solid ${T.border};cursor:pointer;transition:background 0.12s;position:relative; }
  .inv-row:hover { background:${T.surfaceHigh}; }
  .inv-row.active { background:rgba(138,138,138,0.12);border-left:2px solid ${T.blue}; }
  .inv-row.active::after { content:'';position:absolute;right:0;top:50%;transform:translateY(-50%);width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:6px solid ${T.bg}; }
  .inv-row-top { display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px; }
  .inv-supplier { font-size:13px;color:${T.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1; }
  .inv-amount { font-size:13px;color:${T.yellow};font-family:Inter, system-ui, sans-serif;flex-shrink:0; }
  .inv-meta { font-size:10px;color:${T.textMuted};margin-bottom:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .badge-row { display:flex;gap:4px;flex-wrap:wrap; }
  .badge { display:inline-flex;align-items:center;padding:1px 6px;border-radius:3px;font-size:9px;text-transform:none;letter-spacing:0.2px;border:1px solid;font-family:Inter, system-ui, sans-serif; }

  /* RIGHT PANEL — image flex:1 (fills remaining), edit fixed 360px */
  .right-panel { flex:1;display:flex;gap:0;overflow:hidden;min-width:0; }
  .img-panel { flex:1;min-width:0;max-width:calc(100% - 720px);display:flex;flex-direction:column;overflow:hidden;border-right:1px solid ${T.border};background:${T.bg}; }
  .img-toolbar { padding:8px 12px;border-bottom:1px solid ${T.border};display:flex;align-items:center;gap:8px;background:${T.surface};flex-shrink:0; }
  .img-toolbar-btn { width:32px;height:32px;border-radius:4px;border:1px solid ${T.border};background:transparent;color:${T.textDim};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s; }
  .img-toolbar-btn:hover { border-color:${T.blue};color:${T.blue}; }
  .img-zoom-label { font-size:11px;color:${T.textMuted};letter-spacing:0.2px;min-width:44px;text-align:center; }
  .img-canvas { flex:1;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:16px;scrollbar-width:thin;scrollbar-color:${T.border} transparent; }
  .img-canvas::-webkit-scrollbar { width:6px;height:6px; }
  .img-canvas::-webkit-scrollbar-thumb { background:${T.border};border-radius:3px; }
  .img-canvas img { display:block;transform-origin:top center;transition:transform 0.15s;cursor:zoom-in;touch-action:pinch-zoom; }
  .no-image { flex:1;display:flex;align-items:center;justify-content:center;color:${T.textMuted};font-size:13px;letter-spacing:0.3px;flex-direction:column;gap:12px; }

  /* EDIT PANEL — fixed 360px */
  .edit-panel { width:720px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;background:${T.surface}; }
  .edit-scroll { flex:1;overflow-y:auto;padding:14px;scrollbar-width:thin;scrollbar-color:${T.border} transparent; }
  .edit-scroll::-webkit-scrollbar { width:4px; }
  .edit-scroll::-webkit-scrollbar-thumb { background:${T.border};border-radius:2px; }
  .edit-footer { padding:10px 14px;border-top:1px solid ${T.border};flex-shrink:0; }
  .e-section-title { font-family:Inter, system-ui, sans-serif;font-size:14px;letter-spacing:0.3px;color:${T.yellow};text-transform:none;margin-bottom:10px;display:flex;align-items:center;gap:4px; }
  .e-section-title::before { content:'>';color:${T.blue}; }
  .e-label { font-size:9px;letter-spacing:0.3px;color:${T.text};text-transform:none;margin-bottom:3px;display:block; }
  .e-input { width:100%;padding:7px 10px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:12px;outline:none;transition:border-color 0.2s; }
  .e-input:focus { border-color:${T.blue}; }
  .e-input::placeholder { color:${T.textMuted}; }
  .e-input.mono { color:${T.yellow}; }
  .e-input.mono:focus { border-color:${T.yellow}; }
  .e-select { width:100%;padding:7px 10px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:12px;outline:none;appearance:none;cursor:pointer; }
  .e-select:focus { border-color:${T.blue}; }
  .e-textarea { width:100%;padding:7px 10px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:12px;outline:none;resize:vertical;min-height:60px; }
  .e-textarea:focus { border-color:${T.blue}; }
  .e-textarea::placeholder { color:${T.textMuted}; }
  .cat-pills { display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px; }
  .cat-pill { padding:3px 8px;border-radius:3px;border:1px solid ${T.border};background:transparent;color:${T.textDim};font-family:Inter, system-ui, sans-serif;font-size:9px;letter-spacing:0.2px;cursor:pointer;transition:all 0.15s;text-transform:none; }
  .cat-pill.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .save-btn { width:100%;padding:11px;background:${T.yellow};border:none;border-radius:5px;color:${T.bg};font-family:Inter, system-ui, sans-serif;font-size:18px;letter-spacing:0.3px;cursor:pointer;box-shadow:0 0 16px rgba(229,229,229,0.1);transition:box-shadow 0.2s; }
  .save-btn:hover { box-shadow:0 0 24px rgba(229,229,229,0.18); }
  .save-btn:disabled { opacity:0.5;cursor:default; }
  .dupe-bar { display:flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(253,186,116,0.12);border:1px solid ${T.warning};border-radius:4px;margin-bottom:10px;font-size:11px;color:${T.warning}; }
  .err-bar { display:flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(252,165,165,0.12);border:1px solid ${T.error};border-radius:4px;margin-bottom:10px;font-size:11px;color:${T.error}; }
  .saved-flash { display:flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(134,239,172,0.12);border:1px solid ${T.success};border-radius:4px;margin-bottom:10px;font-size:11px;color:${T.success}; }
  .empty-right { flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:${T.textMuted};font-size:13px;letter-spacing:0.3px; }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes tspin { to{transform:rotate(360deg)} }
  .rescan-btn { display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid ${T.border};border-radius:4px;background:transparent;color:${T.textDim};font-family:Inter, system-ui, sans-serif;font-size:11px;cursor:pointer;letter-spacing:0.2px;transition:all 0.15s; }
  .rescan-btn:hover { border-color:${T.blue};color:${T.blue}; }
  .rescan-btn.done { border-color:${T.success};color:${T.success}; }
  .f-row { margin-bottom:10px; }
  .two-col { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
  .li-row { display:grid;grid-template-columns:1fr 72px 72px 72px 24px;gap:4px;align-items:center;margin-bottom:4px; }
  .li-input { width:100%;padding:5px 7px;background:${T.bg};border:1px solid ${T.border};border-radius:3px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:11px;outline:none; }
  .li-input:focus { border-color:${T.blue}; }
  .li-input.amt { color:${T.yellow}; }
  .li-input.amt:focus { border-color:${T.yellow}; }
  .li-del { width:24px;height:24px;border-radius:3px;border:1px solid ${T.border};background:transparent;color:${T.textMuted};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all 0.15s;flex-shrink:0; }
  .li-del:hover { border-color:${T.error};color:${T.error}; }
  .li-add-btn { width:100%;padding:6px;border:1px dashed ${T.border};border-radius:4px;background:transparent;color:${T.textDim};font-family:Inter, system-ui, sans-serif;font-size:10px;letter-spacing:0.2px;cursor:pointer;text-transform:none;transition:all 0.15s;margin-top:4px; }
  .li-add-btn:hover { border-color:${T.blue};color:${T.blue}; }
  .li-header { display:grid;grid-template-columns:1fr 72px 72px 72px 24px;gap:4px;margin-bottom:4px; }
  .li-col-label { font-size:8px;letter-spacing:0.2px;color:${T.textMuted};text-transform:none; }
  .match-bar { display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:4px;margin-top:8px;margin-bottom:4px;font-size:10px;letter-spacing:0.2px; }
  .match-bar.ok { background:rgba(134,239,172,0.1);border:1px solid ${T.success};color:${T.success}; }
  .match-bar.off { background:rgba(252,165,165,0.1);border:1px solid ${T.error};color:${T.error}; }
  .match-bar.empty { background:${T.surfaceHigh};border:1px solid ${T.border};color:${T.textMuted}; }
  /* ── MOBILE (≤768px) ── */
  @media (max-width:768px) {
    .left-panel { width:100% !important;border-right:none; }
    .right-panel { flex-direction:column; }
    .img-panel { max-width:100% !important;height:45svh;flex:none;border-right:none;border-bottom:1px solid ${T.border}; }
    .edit-panel { width:100% !important;flex:1; }
    .mob-hidden { display:none !important; }
    .mob-back { display:flex !important; }
    .mob-only { display:flex !important; }
    .review-body.mob-list .left-panel { display:flex; }
    .review-body.mob-list .right-panel-wrap { display:none; }
    .review-body.mob-detail .left-panel { display:none; }
    .review-body.mob-detail .right-panel-wrap { display:flex;flex:1;flex-direction:column;overflow:hidden;min-width:0; }
  }
  @media (min-width:769px) {
    .mob-back { display:none !important; }
    .right-panel-wrap { display:flex;flex:1;overflow:hidden;min-width:0; }
  }
`;

export default function ReviewPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [filterMatched, setFilterMatched] = useState<'all'|'match'|'off'|'none'>('all');
  const [filterDupes, setFilterDupes] = useState<'all'|'dupes'|'clean'>('all');
  const [zoom, setZoom] = useState(1);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [formData, setFormData] = useState<InvoiceFormData>({supplier:'',description:'',invoice_date:'',amount:'',vat_amount:'',products_services:'',business_name:''});
  const [category, setCategory] = useState<InvoiceCategory|null>(null);
  const [projectId, setProjectId] = useState<string|null>(null);
  const [documentNumber, setDocumentNumber] = useState<string|null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string|null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string|null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [rescanDone, setRescanDone] = useState(false);
  const [mobileView, setMobileView] = useState<'list'|'detail'>('list');
  const imgRef = useRef<HTMLImageElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
    const { data } = await supabase.from('invoices').select('*').eq('user_id', user?.id||'').order('created_at', {ascending:false});
    setInvoices(data || []);
    const { data: proj } = await supabase.from('projects').select('id,name').eq('user_id', user?.id||'').order('name');
    setProjects(proj || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectInvoice = (inv: Invoice) => {
    setSelected(inv);
    setZoom(1);
    setMobileView('detail');
    setSaveError(null); setSavedFlash(false); setRescanDone(false);
    setFormData({supplier:inv.supplier||'',description:inv.description||'',invoice_date:inv.invoice_date||'',amount:inv.amount?.toString()||'',vat_amount:inv.vat_amount?.toString()||'',products_services:inv.products_services||'',business_name:inv.business_name||''});
    setCategory(inv.category||null);
    setProjectId((inv as any).project_id||null);
    setDocumentNumber(inv.document_number||null);
    setLineItems(Array.isArray(inv.line_items) ? inv.line_items : []);
    // Check duplicate
    setDuplicateWarning(null);
    const dupedDoc = findDuplicate(inv, invoices);
    if (dupedDoc) {
      const ref = dupedDoc.document_number ? ' #' + dupedDoc.document_number : '';
      const dt = dupedDoc.invoice_date ? ' · ' + new Date(dupedDoc.invoice_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '';
      setDuplicateWarning('⚡ Duplicate of: ' + (dupedDoc.supplier||'Unknown') + ref + dt);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setSaveError(null); setSavedFlash(false);
    try {
      const { error } = await supabase.from('invoices').update({
        supplier: formData.supplier||null, description: formData.description||null,
        invoice_date: formData.invoice_date||null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        products_services: formData.products_services||null, business_name: formData.business_name||null,
        category: category||null, project_id: projectId||null,
        document_number: documentNumber||null,
        line_items: lineItems.length > 0 ? lineItems : null,
        status: 'reviewed', updated_at: new Date().toISOString(),
      }).eq('id', selected.id);
      if (error) throw error;
      // Update local list
      const updated = { ...selected, ...formData, amount: formData.amount?parseFloat(formData.amount):null, vat_amount: formData.vat_amount?parseFloat(formData.vat_amount):null, category, project_id: projectId, document_number: documentNumber, status: 'reviewed' } as Invoice;
      setInvoices(prev => prev.map(i => i.id === selected.id ? updated : i));
      setSelected(updated);
      setSavedFlash(true);
      setTimeout(() => router.push('/invoices/list'), 1200);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleRescan = async () => {
    if (!selected?.image_path && !selected?.image_url) return;
    setRescanning(true); setRescanDone(false);
    try {
      let base64: string;
      if (selected.image_path) {
        const { data, error: dlErr } = await supabase.storage.from('invoices').download(selected.image_path);
        if (dlErr || !data) throw new Error('Download failed');
        base64 = await new Promise<string>((res,rej)=>{const r=new FileReader();r.onloadend=()=>res(r.result as string);r.onerror=rej;r.readAsDataURL(data);});
      } else {
        const res = await fetch(selected.image_url!);
        const blob = await res.blob();
        base64 = await new Promise<string>((res,rej)=>{const r=new FileReader();r.onloadend=()=>res(r.result as string);r.onerror=rej;r.readAsDataURL(blob);});
      }
      const ocrRes = await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64})});
      if (!ocrRes.ok) throw new Error('OCR failed');
      const result = await ocrRes.json();
      setFormData({supplier:result.supplier||formData.supplier,description:result.description||formData.description,invoice_date:result.invoice_date||formData.invoice_date,amount:result.amount?.toString()||formData.amount,vat_amount:result.vat_amount?.toString()||formData.vat_amount,products_services:result.products_services||formData.products_services,business_name:result.business_name||formData.business_name});
      if (result.category) setCategory(result.category);
      if (result.document_number) setDocumentNumber(result.document_number);
      setRescanDone(true); setTimeout(()=>setRescanDone(false),3000);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Rescan failed'); }
    finally { setRescanning(false); }
  };

  const fc = (field: keyof InvoiceFormData, val: string) => setFormData(p => ({ ...p, [field]: val }));

  const filtered = invoices.filter(inv => {
    if (filterMatched !== 'all' && getMatchStatus(inv) !== filterMatched) return false;
    if (filterDupes === 'dupes' && !findDuplicate(inv, invoices) !== null) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(inv.supplier||'').toLowerCase().includes(q) && !(inv.document_number||'').toLowerCase().includes(q) && !(inv.description||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const dupeCount = invoices.filter(i => findDuplicate(i, invoices) !== null).length;

  return (
    <>
      <style>{css}</style>
      <div className="review-layout">
        <div className="scanline"/>

        <header className="review-header">
          {mobileView==='detail'
            ? <button className="mob-back" onClick={()=>setMobileView('list')} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:4,color:T.textDim,padding:'5px 10px',cursor:'pointer',fontFamily:'Inter, system-ui, sans-serif',fontSize:11,letterSpacing:1,alignItems:'center',gap:4,flexShrink:0}}>← BACK</button>
            : <button onClick={()=>router.push('/')} style={{width:36,height:36,borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',color:T.textDim,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontFamily:'monospace',flexShrink:0}}>←</button>
          }
          <span className="review-title">Go Capture · Review</span>
          <span style={{fontSize:11,color:T.textMuted,letterSpacing:1,flexShrink:0}}>{filtered.length} / {invoices.length}</span>
        </header>

        <div className={`review-body mob-${mobileView}`}>
          {/* ── LEFT PANEL ── */}
          <div className="left-panel">
            <div className="left-search">
              <div className="left-search-inner">
                <Search size={14} color={T.textMuted}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier, doc no…"/>
                {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:T.textMuted,padding:0}}><X size={12}/></button>}
              </div>
            </div>
            <div className="filter-chips">
              <button className={`fchip${filterMatched==='match'?' active':''}`} onClick={()=>setFilterMatched(v=>v==='match'?'all':'match')}>✓ Matched</button>
              <button className={`fchip${filterMatched==='off'?' active':''}`} onClick={()=>setFilterMatched(v=>v==='off'?'all':'off')}>⚠ Off</button>
              <button className={`fchip orange${filterDupes==='dupes'?' active':''}`} onClick={()=>setFilterDupes(v=>v==='dupes'?'all':'dupes')}>⚡ Dupes{dupeCount>0?` (${dupeCount})`:''}</button>
            </div>
            <div className="left-count">{filtered.length} result{filtered.length!==1?'s':''}</div>
            <div className="left-list">
              {loading ? (
                <div style={{padding:20,textAlign:'center',color:T.textMuted,fontSize:11,letterSpacing:0.5}}>LOADING…</div>
              ) : filtered.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:T.textMuted,fontSize:11,letterSpacing:0.5}}>[ NO RESULTS ]</div>
              ) : filtered.map(inv => {
                const match = getMatchStatus(inv);
                const duped = findDuplicate(inv, invoices) !== null;
                const isActive = selected?.id === inv.id;
                return (
                  <div key={inv.id} className={`inv-row${isActive?' active':''}`} onClick={()=>selectInvoice(inv)}>
                    <div className="inv-row-top">
                      <span className="inv-supplier">{inv.supplier||'Unknown'}</span>
                      <span className="inv-amount">{inv.amount?`R ${Math.round(inv.amount).toLocaleString('en-ZA')}`:'-'}</span>
                    </div>
                    <div className="inv-meta">{inv.document_number?`#${inv.document_number} · `:''}{inv.invoice_date||inv.created_at?.slice(0,10)||''}</div>
                    <div className="badge-row">
                      {match==='match'&&<span className="badge" style={{background:'rgba(134,239,172,0.12)',color:T.success,borderColor:T.success}}>✓</span>}
                      {match==='off'&&<span className="badge" style={{background:'rgba(252,165,165,0.12)',color:T.error,borderColor:T.error}}>⚠</span>}
                      {match==='none'&&<span className="badge" style={{color:T.textMuted,borderColor:T.border}}>no lines</span>}
                      {duped&&<span className="badge" style={{background:'rgba(253,186,116,0.12)',color:T.warning,borderColor:T.warning}}>⚡ dup</span>}
                      {inv.status==='reviewed'&&<span className="badge" style={{color:T.success,borderColor:'rgba(74,222,128,0.3)'}}>done</span>}
                      {isActive && <ChevronRight size={10} color={T.blue} style={{marginLeft:'auto'}}/>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL WRAP ── */}
          <div className="right-panel-wrap">
          {!selected ? (
            <div className="empty-right">
              <div style={{width:64,height:64,borderRadius:8,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ScanLine size={28} color={T.textMuted}/>
              </div>
              <div>SELECT A DOCUMENT</div>
              <div style={{fontSize:10,color:T.textMuted,letterSpacing:1}}>to view and edit</div>
            </div>
          ) : (
            <div className="right-panel">
              {/* Image viewer */}
              <div className="img-panel">
                <div className="img-toolbar">
                  <button className="img-toolbar-btn" onClick={()=>setZoom(z=>Math.max(0.25,z-0.25))}><ZoomOut size={15}/></button>
                  <span className="img-zoom-label">{Math.round(zoom*100)}%</span>
                  <button className="img-toolbar-btn" onClick={()=>setZoom(z=>Math.min(4,z+0.25))}><ZoomIn size={15}/></button>
                  <button className="img-toolbar-btn" onClick={()=>setZoom(1)}><RotateCcw size={15}/></button>
                  <div style={{flex:1}}/>
                  <button
                    className={`rescan-btn${rescanDone?' done':''}`}
                    onClick={handleRescan} disabled={rescanning||(!selected.image_path&&!selected.image_url)}
                  >
                    {rescanning ? <Loader2 size={13} style={{animation:'tspin 1s linear infinite'}}/> : rescanDone ? <CheckCircle size={13}/> : <ScanLine size={13}/>}
                    {rescanning ? 'Scanning…' : rescanDone ? 'Done' : 'Re-scan OCR'}
                  </button>
                </div>
                {selected.image_url ? (
                  (() => {
                    const isPdf = selected.image_url.toLowerCase().includes('.pdf') || selected.image_path?.toLowerCase().endsWith('.pdf');
                    return isPdf ? (
                      <div className="img-canvas" style={{padding:0,overflow:'hidden'}}>
                        <iframe
                          src={selected.image_url}
                          style={{width:'100%',height:'100%',border:'none',display:'block'}}
                          title="Invoice PDF"
                        />
                      </div>
                    ) : (
                      <div className="img-canvas" onClick={()=>setZoom(z=>z<2?2:1)}>
                        <img
                          ref={imgRef}
                          src={selected.image_url}
                          alt="Invoice"
                          style={{ transform:`scale(${zoom})`, cursor: zoom < 2 ? 'zoom-in' : 'zoom-out' }}
                        />
                      </div>
                    );
                  })()
                ) : (
                  <div className="no-image">
                    <AlertCircle size={32} color={T.textMuted}/>
                    <div>NO IMAGE ON FILE</div>
                  </div>
                )}
              </div>

              {/* Edit panel */}
              <div className="edit-panel">
                <div className="edit-scroll">

                  {duplicateWarning && (
                    <div className="dupe-bar">{duplicateWarning}</div>
                  )}
                  {saveError && (
                    <div className="err-bar"><AlertCircle size={13}/>{saveError}</div>
                  )}
                  {savedFlash && (
                    <div className="saved-flash"><CheckCircle size={13}/>Saved</div>
                  )}

                  <div className="e-section-title">Document</div>

                  <div className="f-row">
                    <label className="e-label">Doc / Ref No.</label>
                    <input className="e-input" value={documentNumber||''} onChange={e=>setDocumentNumber(e.target.value||null)} placeholder="e.g. INV-0042"/>
                  </div>

                  <div className="f-row">
                    <label className="e-label">Supplier</label>
                    <input className="e-input" value={formData.supplier} onChange={e=>fc('supplier',e.target.value)} placeholder="Supplier name"/>
                  </div>

                  <div className="f-row">
                    <label className="e-label">Business Name</label>
                    <input className="e-input" value={formData.business_name} onChange={e=>fc('business_name',e.target.value)} placeholder="Business"/>
                  </div>

                  <div className="f-row">
                    <label className="e-label">Invoice Date</label>
                    <input type="date" className="e-input" value={formData.invoice_date} onChange={e=>fc('invoice_date',e.target.value)}/>
                  </div>

                  <div className="two-col f-row">
                    <div>
                      <label className="e-label">Amount</label>
                      <input type="number" className="e-input mono" value={formData.amount} onChange={e=>fc('amount',e.target.value)} placeholder="0"/>
                    </div>
                    <div>
                      <label className="e-label">VAT</label>
                      <input type="number" className="e-input mono" value={formData.vat_amount} onChange={e=>fc('vat_amount',e.target.value)} placeholder="0"/>
                    </div>
                  </div>

                  <div className="f-row">
                    <label className="e-label">Description</label>
                    <textarea className="e-textarea" value={formData.description} onChange={e=>fc('description',e.target.value)} placeholder="Description"/>
                  </div>

                  <div className="f-row">
                    <label className="e-label">Products / Services</label>
                    <textarea className="e-textarea" value={formData.products_services} onChange={e=>fc('products_services',e.target.value)} placeholder="Products or services"/>
                  </div>

                  <div className="e-section-title" style={{marginTop:4}}>Category</div>
                  <div className="cat-pills">
                    {CATEGORIES.map(cat=>(
                      <button key={cat} className={`cat-pill${category===cat?' active':''}`} onClick={()=>setCategory(cat)}>{cat}</button>
                    ))}
                    {category && <button className="cat-pill" style={{borderColor:T.error,color:T.error}} onClick={()=>setCategory(null)}>✕ Clear</button>}
                  </div>

                  <div className="e-section-title">Project</div>
                  <div className="f-row" style={{position:'relative'}}>
                    <select className="e-select" value={projectId||''} onChange={e=>setProjectId(e.target.value||null)}>
                      <option value="">-- No project --</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:T.blue,pointerEvents:'none',fontSize:11}}>▼</span>
                  </div>

                  <div className="e-section-title" style={{marginTop:4}}>Line Items</div>
                  {lineItems.length > 0 && (
                    <div className="li-header">
                      <span className="li-col-label">Description</span>
                      <span className="li-col-label">Qty</span>
                      <span className="li-col-label">Unit</span>
                      <span className="li-col-label">Total</span>
                      <span/>
                    </div>
                  )}
                  {lineItems.map((item, i) => (
                    <div key={i} className="li-row">
                      <input className="li-input" value={item.description||''} onChange={e=>{const n=[...lineItems];n[i]={...n[i],description:e.target.value};setLineItems(n);}} placeholder="Description"/>
                      <input className="li-input" type="number" value={item.quantity??''} onChange={e=>{const n=[...lineItems];n[i]={...n[i],quantity:e.target.value?parseFloat(e.target.value):null};setLineItems(n);}} placeholder="1"/>
                      <input className="li-input amt" type="number" value={item.unit_price??''} onChange={e=>{const n=[...lineItems];n[i]={...n[i],unit_price:e.target.value?parseFloat(e.target.value):null,line_total:e.target.value&&n[i].quantity?(parseFloat(e.target.value)*n[i].quantity!):n[i].line_total};setLineItems(n);}} placeholder="0.00"/>
                      <input className="li-input amt" type="number" value={item.line_total??''} onChange={e=>{const n=[...lineItems];n[i]={...n[i],line_total:e.target.value?parseFloat(e.target.value):null};setLineItems(n);}} placeholder="0.00"/>
                      <button className="li-del" onClick={()=>setLineItems(lineItems.filter((_,j)=>j!==i))}>×</button>
                    </div>
                  ))}
                  <button className="li-add-btn" onClick={()=>setLineItems([...lineItems,{description:'',quantity:1,unit_price:null,line_total:null}])}>+ Add Line</button>
                  {(() => {
                    const itemsTotal = lineItems.reduce((s,i)=>s+(i.line_total??0),0);
                    const vatAmt = formData.vat_amount ? parseFloat(formData.vat_amount) : 0;
                    const inclTotal = formData.amount ? parseFloat(formData.amount) : 0;
                    const exclTotal = inclTotal > 0 ? inclTotal - vatAmt : 0;
                    if (lineItems.length === 0) return <div className="match-bar empty"><span>No line items</span><span>—</span></div>;
                    const match = exclTotal > 0 && Math.abs(itemsTotal - exclTotal) < 1;
                    const diff = Math.abs(itemsTotal - exclTotal);
                    return (
                      <div className={`match-bar ${exclTotal === 0 ? 'empty' : match ? 'ok' : 'off'}`}>
                        <span>{match ? '✓ Lines match excl. total' : exclTotal === 0 ? 'Enter amount to check' : `⚠ R ${Math.round(diff).toLocaleString('en-ZA')} off`}</span>
                        <span style={{fontFamily:'Inter, system-ui, sans-serif'}}>R {Math.round(itemsTotal).toLocaleString('en-ZA')} vs R {Math.round(exclTotal).toLocaleString('en-ZA')} excl.</span>
                      </div>
                    );
                  })()}

                </div>
                <div className="edit-footer">
                  <button className="save-btn" disabled={saving} onClick={handleSave}>
                    {saving ? 'SAVING…' : 'SAVE CHANGES'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>{/* end right-panel-wrap */}
        </div>
      </div>
    </>
  );
}
