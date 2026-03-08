'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFormData, LineItem, InvoiceCategory, DocumentType, DocStatus, DOCUMENT_TYPE_LABELS, DOC_STATUS_LABELS } from '@/types/invoice';
import InvoiceForm from '@/components/InvoiceForm';
import { ArrowLeft, Trash2, Edit2, Loader2, AlertCircle, ScanLine, CheckCircle, ZoomIn, X } from 'lucide-react';

const T = {
  bg: '#0d0d0d', surface: '#1a1a1a', surfaceHigh: '#242424', border: '#2a2a2a',
  yellow: '#facc15', yellowGlow: 'rgba(250,204,21,0.15)',
  blue: '#6366f1', blueGlow: 'rgba(99,102,241,0.2)',
  text: '#e2e8f0', textDim: '#94a3b8', textMuted: '#475569',
  error: '#f87171', success: '#4ade80', warning: '#fb923c',
};

const CATEGORIES: InvoiceCategory[] = [
  'Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software',
  'Professional Services','Food & Entertainment','Equipment','Marketing','Other',
];

const fmtZAR = (n: number | null | undefined) =>
  n != null ? `R ${Math.round(n).toLocaleString('en-ZA')}` : null;

const css = `
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .detail-page { min-height:100svh;background:${T.bg};font-family:var(--font-share-tech-mono),'Courier New',monospace;color:${T.text}; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);pointer-events:none;z-index:1000; }
  .detail-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(99,102,241,0.08); }
  .btn-icon { width:38px;height:38px;border-radius:6px;border:1px solid ${T.border};background:transparent;color:${T.textDim};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s; }
  .btn-icon:hover { border-color:${T.blue};color:${T.blue}; }
  .btn-icon.danger { color:${T.error};border-color:transparent; }
  .btn-icon.ok { border-color:${T.success};color:${T.success}; }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .t-card-title { font-family:var(--font-vt323),monospace;font-size:16px;letter-spacing:2px;color:${T.yellow};text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px; }
  .t-card-title::before { content:'>';color:${T.blue}; }
  .t-pill { padding:6px 12px;border-radius:4px;border:1px solid ${T.border};background:transparent;color:${T.textDim};font-family:var(--font-share-tech-mono),monospace;font-size:11px;letter-spacing:1px;cursor:pointer;transition:all 0.15s;text-transform:uppercase; }
  .t-pill:hover { border-color:${T.blue};color:${T.text}; }
  .t-pill.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .detail-label { font-size:10px;letter-spacing:2px;color:${T.text};text-transform:uppercase;margin-bottom:4px; }
  .detail-value { font-size:14px;color:${T.text};font-family:var(--font-share-tech-mono),monospace; }
  .badge { display:inline-flex;align-items:center;padding:3px 10px;border-radius:4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;border:1px solid;font-family:var(--font-share-tech-mono),monospace; }
  .err-bar { display:flex;align-items:center;gap:8px;padding:12px;background:rgba(248,113,113,0.1);border:1px solid ${T.error};border-radius:6px;margin-bottom:16px;color:${T.error};font-size:13px; }
  .dupe-bar { display:flex;align-items:center;gap:8px;padding:12px;background:rgba(251,146,60,0.1);border:1px solid ${T.warning};border-radius:6px;margin-bottom:16px;color:${T.warning};font-size:13px; }
  .t-select { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:var(--font-share-tech-mono),monospace;font-size:13px;outline:none;appearance:none;cursor:pointer; }
  .t-select:focus { border-color:${T.blue}; }
  .img-wrap { position:relative;cursor:pointer; }
  .img-zoom-btn { position:absolute;bottom:8px;right:8px;width:32px;height:32px;border-radius:6px;background:rgba(0,0,0,0.6);border:1px solid ${T.border};display:flex;align-items:center;justify-content:center;color:${T.text};cursor:pointer; }
  .img-zoom-btn:hover { background:rgba(99,102,241,0.4); }
  .lightbox { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:2000;display:flex;align-items:center;justify-content:center; }
  .lightbox-close { position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid ${T.border};display:flex;align-items:center;justify-content:center;color:${T.text};cursor:pointer; }
  .lightbox img { max-width:95vw;max-height:90vh;object-fit:contain;touch-action:pinch-zoom; }
  @keyframes tspin { to{transform:rotate(360deg)} }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
`;

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanDone, setRescanDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [category, setCategory] = useState<InvoiceCategory | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier:'', description:'', invoice_date:'', amount:'', vat_amount:'', products_services:'', business_name:'',
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
        if (error) throw error;
        setInvoice(data);
        setCategory(data.category || null);
        setLineItems(Array.isArray(data.line_items) ? data.line_items : []);
        setProjectId(data.project_id || null);
        setFormData({ supplier:data.supplier||'', description:data.description||'', invoice_date:data.invoice_date||'', amount:data.amount?.toString()||'', vat_amount:data.vat_amount?.toString()||'', products_services:data.products_services||'', business_name:data.business_name||'' });
        // Check for duplicates
        checkDuplicate(data);
      } catch { setError('Failed to load invoice'); }
      finally { setLoading(false); }
    };
    fetchInvoice();
    const fetchProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id,name').eq('user_id', user?.id||'').order('name');
      setProjects(data || []);
    };
    fetchProjects();
  }, [id]);

  const checkDuplicate = async (inv: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (inv.document_number) {
      const { data } = await supabase.from('invoices').select('id').eq('user_id', user?.id||'').eq('document_number', inv.document_number).neq('id', id).limit(1);
      if (data && data.length > 0) { setDuplicateWarning(`Doc ref ${inv.document_number} exists on another record`); return; }
    }
    if (inv.supplier && inv.amount && inv.invoice_date) {
      const { data } = await supabase.from('invoices').select('id').eq('user_id', user?.id||'').eq('supplier', inv.supplier).eq('amount', inv.amount).eq('invoice_date', inv.invoice_date).neq('id', id).limit(1);
      if (data && data.length > 0) { setDuplicateWarning('Possible duplicate — same supplier, amount and date on another record'); }
    }
  };

  const handleRescan = async () => {
    if (!invoice?.image_path && !invoice?.image_url) { setError('No image to re-scan'); return; }
    setRescanning(true); setRescanDone(false); setError(null);
    try {
      let base64: string;
      if (invoice.image_path) {
        const { data, error: dlError } = await supabase.storage.from('invoices').download(invoice.image_path);
        if (dlError || !data) throw new Error('Could not download image');
        base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(data); });
      } else {
        const imgRes = await fetch(invoice.image_url!);
        const blob = await imgRes.blob();
        base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
      }
      const ocrRes = await fetch('/api/ocr', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: base64 }) });
      if (!ocrRes.ok) throw new Error('OCR failed');
      const result = await ocrRes.json();
      const updates = { supplier:result.supplier??invoice.supplier, description:result.description??invoice.description, invoice_date:result.invoice_date??invoice.invoice_date, amount:result.amount??invoice.amount, vat_amount:result.vat_amount??invoice.vat_amount, products_services:result.products_services??invoice.products_services, business_name:result.business_name??invoice.business_name, category:result.category||null, line_items:result.line_items?.length>0?result.line_items:null, updated_at:new Date().toISOString() };
      const { error: updateError } = await supabase.from('invoices').update(updates).eq('id', id);
      if (updateError) throw updateError;
      setInvoice({ ...invoice, ...updates } as Invoice);
      setCategory(result.category||null);
      setLineItems(result.line_items||[]);
      setFormData({ supplier:updates.supplier||'', description:updates.description||'', invoice_date:updates.invoice_date||'', amount:updates.amount?.toString()||'', vat_amount:updates.vat_amount?.toString()||'', products_services:updates.products_services||'', business_name:updates.business_name||'' });
      setRescanDone(true); setTimeout(()=>setRescanDone(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Re-scan failed'); }
    finally { setRescanning(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const { error: updateError } = await supabase.from('invoices').update({
        supplier:formData.supplier||null, description:formData.description||null,
        invoice_date:formData.invoice_date||null,
        amount:formData.amount?parseFloat(formData.amount):null,
        vat_amount:formData.vat_amount?parseFloat(formData.vat_amount):null,
        products_services:formData.products_services||null, business_name:formData.business_name||null,
        category:category||null, line_items:lineItems.length>0?lineItems:null,
        project_id:projectId||null, status:'reviewed', updated_at:new Date().toISOString(),
      }).eq('id', id);
      if (updateError) throw updateError;
      router.push('/invoices');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return;
    setDeleting(true);
    try {
      if (invoice?.image_path) await supabase.storage.from('invoices').remove([invoice.image_path]);
      const { error: deleteError } = await supabase.from('invoices').delete().eq('id', id);
      if (deleteError) throw deleteError;
      router.push('/invoices');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); setDeleting(false); }
  };

  const cancelEdit = () => {
    setEditing(false);
    if (invoice) {
      setFormData({ supplier:invoice.supplier||'', description:invoice.description||'', invoice_date:invoice.invoice_date||'', amount:invoice.amount?.toString()||'', vat_amount:invoice.vat_amount?.toString()||'', products_services:invoice.products_services||'', business_name:invoice.business_name||'' });
      setCategory(invoice.category||null);
      setProjectId((invoice as any).project_id||null);
      setLineItems(Array.isArray(invoice.line_items)?invoice.line_items:[]);
    }
  };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="detail-page" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <Loader2 size={32} color={T.blue} style={{animation:'tspin 1s linear infinite'}}/>
      </div>
    </>
  );

  if (!invoice) return (
    <>
      <style>{css}</style>
      <div className="detail-page" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
        <AlertCircle size={48} color={T.error}/>
        <p style={{fontSize:17,color:T.text,margin:'16px 0 8px'}}>Invoice not found</p>
        <button onClick={()=>router.push('/invoices')} style={{color:T.blue,background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-share-tech-mono),monospace'}}>← Back</button>
      </div>
    </>
  );

  const itemsTotal = lineItems.reduce((s,i)=>s+(i.line_total??0),0);
  const invoiceTotal = invoice.amount??0;
  const diff = Math.abs(itemsTotal - invoiceTotal);
  const totalsMatch = invoiceTotal>0 && diff<1;
  const hasLines = lineItems.length > 0;
  const projectName = projects.find(p=>p.id===projectId)?.name;
  const imageUrl = invoice.image_url;

  return (
    <>
      <style>{css}</style>
      <div className="detail-page">
        <div className="scanline"/>

        <header className="detail-header">
          <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
            <button onClick={()=>router.push('/invoices')} className="btn-icon"><ArrowLeft size={18}/></button>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:'var(--font-vt323),monospace',fontSize:20,letterSpacing:2,color:T.yellow,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {invoice.supplier||'DOCUMENT DETAILS'}<span className="t-cursor">_</span>
              </div>
              {invoice.document_number && <div style={{fontSize:11,color:T.textMuted,letterSpacing:1}}>#{invoice.document_number}</div>}
            </div>
          </div>
          {!editing && (
            <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
              {(invoice.image_url||invoice.image_path) && (
                <button onClick={handleRescan} disabled={rescanning} className={`btn-icon${rescanDone?' ok':''}`}>
                  {rescanning?<Loader2 size={18} style={{animation:'tspin 1s linear infinite'}}/>:rescanDone?<CheckCircle size={18}/>:<ScanLine size={18}/>}
                </button>
              )}
              <button onClick={()=>setEditing(true)} className="btn-icon"><Edit2 size={18}/></button>
              <button onClick={handleDelete} disabled={deleting} className="btn-icon danger">
                {deleting?<Loader2 size={18} style={{animation:'tspin 1s linear infinite'}}/>:<Trash2 size={18}/>}
              </button>
            </div>
          )}
        </header>

        <main style={{padding:16,paddingBottom:80}}>
          {error && <div className="err-bar"><AlertCircle size={18}/>{error}</div>}
          {duplicateWarning && (
            <div className="dupe-bar">
              <span style={{fontSize:16}}>⚡</span>
              <span style={{flex:1}}>{duplicateWarning}</span>
              <button onClick={()=>setDuplicateWarning(null)} style={{background:'none',border:'none',color:T.warning,cursor:'pointer',padding:0}}><X size={14}/></button>
            </div>
          )}

          {/* Image with zoom */}
          {imageUrl && (
            <div className="t-card" style={{padding:8,marginBottom:12}}>
              <div className="img-wrap" onClick={()=>setLightboxOpen(true)}>
                <img src={imageUrl} alt="Invoice" style={{width:'100%',borderRadius:4,maxHeight:240,objectFit:'contain',display:'block'}}/>
                <button className="img-zoom-btn" onClick={e=>{e.stopPropagation();setLightboxOpen(true);}}><ZoomIn size={16}/></button>
              </div>
            </div>
          )}

          {/* Badges row */}
          <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
            {invoice.document_type && <span className="badge" style={{background:T.surfaceHigh,color:T.textDim,borderColor:T.border}}>{DOCUMENT_TYPE_LABELS[(invoice.document_type as DocumentType)||'invoice']}</span>}
            {/* Match status */}
            {hasLines && totalsMatch && <span className="badge" style={{background:'rgba(74,222,128,0.1)',color:T.success,borderColor:T.success}}>✓ Match</span>}
            {hasLines && !totalsMatch && <span className="badge" style={{background:'rgba(248,113,113,0.1)',color:T.error,borderColor:T.error}}>⚠ {fmtZAR(diff)} Off</span>}
            {!hasLines && <span className="badge" style={{background:'transparent',color:T.textMuted,borderColor:T.border}}>No Lines</span>}
            {category && <span className="badge" style={{background:T.blueGlow,color:T.blue,borderColor:T.blue}}>{category}</span>}
            {invoice.is_paid && <span className="badge" style={{background:'rgba(74,222,128,0.1)',color:T.success,borderColor:T.success}}>{invoice.payment_method?invoice.payment_method.toUpperCase():'PAID'}</span>}
          </div>

          {editing ? (
            <>
              <div className="t-card">
                <div className="t-card-title">Category</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {CATEGORIES.map(cat=>(
                    <button key={cat} className={`t-pill${category===cat?' active':''}`} onClick={()=>setCategory(cat)}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="t-card">
                <div className="t-card-title">Project</div>
                <div style={{position:'relative'}}>
                  <select className="t-select" value={projectId||''} onChange={e=>setProjectId(e.target.value||null)}>
                    <option value="">-- No project --</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:T.blue,pointerEvents:'none',fontSize:12}}>▼</span>
                </div>
              </div>
              <div className="t-card">
                <div className="t-card-title">Document Details</div>
                <InvoiceForm formData={formData} onChange={setFormData} onSubmit={handleSave} onCancel={cancelEdit} isLoading={saving} submitLabel="Save Changes"/>
              </div>
            </>
          ) : (
            <>
              <div className="t-card">
                <div className="t-card-title">Document Details</div>
                {[
                  {label:'Business Name',value:invoice.business_name},
                  {label:'Supplier',value:invoice.supplier},
                  {label:'Description',value:invoice.description},
                  {label:'Invoice Date',value:invoice.invoice_date},
                  {label:'Amount',value:fmtZAR(invoice.amount)},
                  {label:'VAT Amount',value:fmtZAR(invoice.vat_amount)},
                  {label:'Products / Services',value:invoice.products_services},
                ].map(({label,value},idx,arr)=>(
                  <div key={label} style={{paddingBottom:idx<arr.length-1?14:0,borderBottom:idx<arr.length-1?`1px solid ${T.border}`:'none',marginBottom:idx<arr.length-1?14:0}}>
                    <div className="detail-label">{label}</div>
                    <div className="detail-value" style={{color:value?T.text:T.textMuted}}>{value||'—'}</div>
                  </div>
                ))}
              </div>

              {lineItems.length>0 && (
                <div className="t-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div className="t-card-title" style={{margin:0}}>Line Items</div>
                    {invoiceTotal>0 && (
                      <span style={{fontSize:10,letterSpacing:1,padding:'3px 8px',borderRadius:4,fontFamily:'var(--font-share-tech-mono),monospace',textTransform:'uppercase',background:totalsMatch?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:totalsMatch?T.success:T.error,border:`1px solid ${totalsMatch?T.success:T.error}`}}>
                        {totalsMatch?'✓ MATCH':`⚠ ${fmtZAR(diff)} OFF`}
                      </span>
                    )}
                  </div>
                  {lineItems.map((item,i)=>(
                    <div key={i} style={{paddingBottom:10,marginBottom:10,borderBottom:i<lineItems.length-1?`1px solid ${T.border}`:'none'}}>
                      <div style={{fontSize:13,color:T.text,marginBottom:3}}>{item.description}</div>
                      <div style={{display:'flex',gap:12,fontSize:12,color:T.textDim,fontFamily:'var(--font-share-tech-mono),monospace'}}>
                        {item.quantity!=null&&<span>×{item.quantity}</span>}
                        {item.unit_price!=null&&<span>@ {fmtZAR(item.unit_price)}</span>}
                        {item.line_total!=null&&<span style={{marginLeft:'auto',color:T.yellow}}>{fmtZAR(item.line_total)}</span>}
                      </div>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                    <span style={{fontSize:11,color:T.textMuted,letterSpacing:2,textTransform:'uppercase'}}>Items Total</span>
                    <span style={{fontFamily:'var(--font-share-tech-mono),monospace',color:T.yellow,fontSize:14}}>{fmtZAR(itemsTotal)}</span>
                  </div>
                </div>
              )}

              <div className="t-card">
                <div className="t-card-title">Project</div>
                <div style={{fontSize:14,color:projectName?T.text:T.textMuted}}>{projectName||'—'}</div>
              </div>
            </>
          )}
        </main>

        {/* Lightbox */}
        {lightboxOpen && imageUrl && (
          <div className="lightbox" onClick={()=>setLightboxOpen(false)}>
            <button className="lightbox-close"><X size={20}/></button>
            <img src={imageUrl} alt="Invoice" onClick={e=>e.stopPropagation()}/>
          </div>
        )}
      </div>
    </>
  );
}
