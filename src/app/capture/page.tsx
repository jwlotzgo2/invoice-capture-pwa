'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import InvoiceForm from '@/components/InvoiceForm';
import { InvoiceFormData, OCRResult } from '@/types/invoice';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Camera, Upload, FileImage } from 'lucide-react';

type Step = 'choose' | 'capture' | 'processing' | 'review';

const T = {
  bg: '#0d0d0d', surface: '#1a1a1a', surfaceHigh: '#242424', border: '#2a2a2a',
  yellow: '#facc15', yellowGlow: 'rgba(250,204,21,0.15)',
  blue: '#6366f1', blueGlow: 'rgba(99,102,241,0.2)',
  text: '#e2e8f0', textDim: '#94a3b8', textMuted: '#475569',
  error: '#f87171', success: '#4ade80',
};

const CATEGORIES = ['Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software','Professional Services','Food & Entertainment','Equipment','Marketing','Other'];
const DOC_TYPES: [string,string][] = [['invoice','Tax Invoice'],['quote','Quote'],['purchase_order','Purchase Order'],['credit_note','Credit Note'],['delivery_note','Delivery Note'],['receipt','Receipt']];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .cap-page { min-height:100svh;background:${T.bg};font-family:'Share Tech Mono','Courier New',monospace;color:${T.text};
    background-image:radial-gradient(ellipse at 20% 20%,rgba(99,102,241,0.06) 0%,transparent 50%),
      radial-gradient(ellipse at 80% 80%,rgba(250,204,21,0.04) 0%,transparent 50%); }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    pointer-events:none;z-index:1000; }
  .cap-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:12px 16px;
    display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:40;
    box-shadow:0 0 20px rgba(99,102,241,0.08); }
  .cap-title { font-family:'VT323',monospace;font-size:22px;letter-spacing:2px;
    color:${T.yellow};text-shadow:0 0 10px rgba(250,204,21,0.3);flex:1; }
  .cap-sub { font-size:11px;color:${T.text};letter-spacing:1px; }
  .btn-icon { width:38px;height:38px;border-radius:6px;border:1px solid ${T.border};
    background:transparent;color:${T.textDim};cursor:pointer;display:flex;
    align-items:center;justify-content:center;transition:all 0.2s; }
  .btn-icon:hover { border-color:${T.blue};color:${T.blue}; }
  .btn-icon.danger { color:${T.error};border-color:transparent; }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;
    padding:16px;margin-bottom:12px;position:relative;overflow:hidden; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .t-card-title { font-family:'VT323',monospace;font-size:16px;letter-spacing:2px;
    color:${T.yellow};text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px; }
  .t-card-title::before { content:'>';color:${T.blue}; }
  .t-pill { padding:6px 12px;border-radius:4px;border:1px solid ${T.border};background:transparent;
    color:${T.textDim};font-family:'Share Tech Mono',monospace;font-size:11px;
    letter-spacing:1px;cursor:pointer;transition:all 0.15s;text-transform:uppercase; }
  .t-pill:hover { border-color:${T.blue};color:${T.text}; }
  .t-pill.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow};
    box-shadow:0 0 8px rgba(250,204,21,0.2); }
  .t-label { font-size:10px;letter-spacing:2px;color:${T.text};text-transform:uppercase;margin-bottom:5px;display:block; }
  .t-input { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};
    border-radius:4px;color:${T.text};font-family:'Share Tech Mono',monospace;font-size:14px;
    outline:none;transition:border-color 0.2s,box-shadow 0.2s; }
  .t-input:focus { border-color:${T.blue};box-shadow:0 0 0 2px ${T.blueGlow}; }
  .t-input::placeholder { color:${T.textMuted}; }
  .t-select { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};
    border-radius:4px;color:${T.text};font-family:'Share Tech Mono',monospace;font-size:13px;
    outline:none;appearance:none;cursor:pointer; }
  .t-select:focus { border-color:${T.blue}; }
  .li-desc { width:100%;padding:6px 10px;background:${T.bg};border:1px solid ${T.border};
    border-radius:4px;color:${T.text};font-family:'Share Tech Mono',monospace;font-size:13px;
    outline:none;margin-bottom:6px;box-sizing:border-box; }
  .li-desc:focus { border-color:${T.blue};box-shadow:0 0 0 2px ${T.blueGlow}; }
  .li-num { padding:6px 8px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;
    color:${T.yellow};font-family:'Share Tech Mono',monospace;font-size:13px;
    outline:none;text-align:right;box-sizing:border-box; }
  .li-num:focus { border-color:${T.yellow};box-shadow:0 0 0 2px ${T.yellowGlow}; }
  .add-row-btn { background:none;border:1px dashed ${T.border};border-radius:4px;
    color:${T.blue};font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:1px;
    padding:8px;width:100%;cursor:pointer;margin-top:8px;transition:all 0.2s;text-transform:uppercase; }
  .add-row-btn:hover { border-color:${T.blue};background:${T.blueGlow}; }
  .t-toggle { width:48px;height:26px;border-radius:4px;border:none;cursor:pointer;
    position:relative;flex-shrink:0;transition:background 0.2s; }
  .t-toggle-thumb { position:absolute;top:3px;width:20px;height:20px;border-radius:2px;
    background:${T.bg};transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.4); }
  .pay-btn { flex:1;padding:8px 0;border:1px solid ${T.border};border-radius:4px;
    background:transparent;color:${T.textDim};font-family:'Share Tech Mono',monospace;
    font-size:12px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;transition:all 0.15s; }
  .pay-btn.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .t-divider { text-align:center;font-size:10px;letter-spacing:3px;color:${T.textMuted};
    margin:4px 0 12px;text-transform:uppercase; }
  .save-btn { width:100%;padding:14px;background:${T.yellow};border:none;border-radius:6px;
    color:${T.bg};font-family:'VT323',monospace;font-size:20px;letter-spacing:3px;
    cursor:pointer;text-transform:uppercase;box-shadow:0 0 20px rgba(250,204,21,0.3);
    transition:box-shadow 0.2s,transform 0.1s; }
  .save-btn:hover { box-shadow:0 0 30px rgba(250,204,21,0.5);transform:translateY(-1px); }
  .save-btn:disabled { opacity:0.5;cursor:default;transform:none; }
  .cancel-btn { width:100%;padding:11px;background:transparent;border:1px solid ${T.border};
    border-radius:6px;color:${T.textDim};font-family:'Share Tech Mono',monospace;
    font-size:13px;letter-spacing:1px;cursor:pointer;margin-top:8px;transition:border-color 0.2s; }
  .cancel-btn:hover { border-color:${T.textDim};color:${T.text}; }
  .err-bar { display:flex;align-items:center;gap:8px;padding:12px;
    background:rgba(248,113,113,0.1);border:1px solid ${T.error};border-radius:6px;
    margin-bottom:16px;color:${T.error};font-size:13px; }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes tspin { to{transform:rotate(360deg)} }
`;

function CapturePageInner() {
  const [step, setStep] = useState<Step>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier: '', description: '', invoice_date: '',
    amount: '', vat_amount: '', products_services: '', business_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('invoice');
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<Array<{description:string;quantity:number|null;unit_price:number|null;line_total:number|null}>>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id,name').eq('user_id', user?.id || '').order('name');
      setProjects(data || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get('source') === 'upload') {
      const img = sessionStorage.getItem('uploadedInvoice');
      if (img) { sessionStorage.removeItem('uploadedInvoice'); handleCapture(img); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData); setStep('processing'); setError(null);
    try {
      const res = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: imageData }) });
      if (!res.ok) throw new Error('Failed to process image');
      const result: OCRResult = await res.json();
      setFormData({ supplier: result.supplier||'', description: result.description||'', invoice_date: result.invoice_date||'', amount: result.amount?.toString()||'', vat_amount: result.vat_amount?.toString()||'', products_services: result.products_services||'', business_name: result.business_name||'' });
      setOcrConfidence(result.confidence);
      setCategory(result.category || null);
      setDocumentType(result.document_type || 'invoice');
      setDocumentNumber(result.document_number || null);
      setLineItems(result.line_items || []);
      setStep('review');
    } catch (err) {
      setError('Failed to extract data. Please fill in manually.'); setStep('review');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      let imageUrl = null, imagePath = null;
      if (capturedImage) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = capturedImage.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const { data: uploadData, error: uploadError } = await supabase.storage.from('invoices').upload(fileName, binaryData, { contentType: 'image/jpeg', upsert: false });
        if (uploadError) throw uploadError;
        imagePath = uploadData.path;
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(imagePath);
        imageUrl = urlData.publicUrl;
      }
      const { error: insertError } = await supabase.from('invoices').insert({
        user_id: user.id, supplier: formData.supplier||null, description: formData.description||null,
        invoice_date: formData.invoice_date||null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        products_services: formData.products_services||null, business_name: formData.business_name||null,
        image_url: imageUrl, image_path: imagePath, original_ocr_values: { ...formData },
        source: 'camera', status: 'pending', is_paid: isPaid,
        payment_method: isPaid && paymentMethod ? paymentMethod : null,
        document_type: documentType||'invoice', doc_status: 'open',
        document_number: documentNumber||null, project_id: projectId||null,
        category: category||null, line_items: lineItems.length > 0 ? lineItems : null,
      });
      if (insertError) throw insertError;
      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally { setSaving(false); }
  };

  const handleBack = () => {
    if (step === 'review' || step === 'capture') { setStep('choose'); setCapturedImage(null); }
    else router.push('/invoices');
  };

  const updateItem = (i: number, field: string, val: number | string | null) => {
    setLineItems(prev => prev.map((r, j) => {
      if (j !== i) return r;
      const updated = { ...r, [field]: val };
      if (field === 'unit_price' || field === 'quantity') {
        const up = field === 'unit_price' ? val as number : r.unit_price;
        const qty = field === 'quantity' ? val as number : r.quantity;
        if (up != null && qty != null) updated.line_total = up * qty;
      }
      return updated;
    }));
  };

  const itemsTotal = lineItems.reduce((s, i) => s + (i.line_total || 0), 0);
  const invoiceTotal = parseFloat(formData.amount) || 0;
  const totalDiff = Math.abs(itemsTotal - invoiceTotal);
  const totalsMatch = invoiceTotal > 0 && totalDiff < 1;
  const fmtZAR = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;

  // ── CHOOSE step ──────────────────────────────────────────────────────────────
  if (step === 'choose') {
    return (
      <>
        <style>{css}</style>
        <div className="cap-page">
          <div className="scanline" />
          <header className="cap-header">
            <button onClick={() => router.push('/invoices')} className="btn-icon"><ArrowLeft size={18} /></button>
            <span className="cap-title">ADD DOCUMENT<span className="t-cursor">_</span></span>
          </header>
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>
            <div style={{ fontFamily:'VT323,monospace', fontSize:18, letterSpacing:3, color:T.textMuted, marginBottom:24, textTransform:'uppercase' }}>
              SELECT CAPTURE METHOD
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:360 }}>
              {[
                { icon: <Camera size={22} color={T.bg} />, label: 'Use Camera', sub: 'Take a photo of your invoice', action: () => setStep('capture'), primary: true },
                { icon: <Upload size={22} color={T.blue} />, label: 'Upload Image', sub: 'Choose a file from your device', action: () => fileInputRef.current?.click(), primary: false },
                { icon: <FileImage size={22} color={T.blue} />, label: 'From Gallery', sub: 'Pick a photo from your gallery', action: () => fileInputRef.current?.click(), primary: false },
              ].map(({ icon, label, sub, action, primary }) => (
                <div key={label} onClick={action} style={{
                  background: primary ? T.yellow : T.surface,
                  border: primary ? 'none' : `1px solid ${T.border}`,
                  borderRadius: 8, padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                  boxShadow: primary ? '0 0 20px rgba(250,204,21,0.25)' : 'none',
                  transition: 'opacity 0.15s',
                }}>
                  <div style={{ width:48, height:48, borderRadius:6, background: primary ? 'rgba(0,0,0,0.15)' : T.blueGlow, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontFamily:'VT323,monospace', letterSpacing:2, color: primary ? T.bg : T.text, marginBottom:2 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize:12, color: primary ? 'rgba(0,0,0,0.5)' : T.textMuted }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display:'none' }} />
        </div>
      </>
    );
  }

  if (step === 'capture') return <CameraCapture onCapture={handleCapture} onClose={() => setStep('choose')} />;

  // ── PROCESSING step ──────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <>
        <style>{css}</style>
        <div className="cap-page" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="scanline" />
          <div style={{ textAlign:'center', padding:'0 24px' }}>
            <div style={{ width:80, height:80, borderRadius:8, border:`1px solid ${T.blue}`, background:`rgba(99,102,241,0.1)`, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
              <Sparkles size={36} color={T.blue} />
            </div>
            <div style={{ fontFamily:'VT323,monospace', fontSize:24, letterSpacing:3, color:T.yellow, marginBottom:8 }}>PROCESSING…</div>
            <div style={{ fontSize:12, color:T.textDim, letterSpacing:1, marginBottom:24 }}>AI IS EXTRACTING DATA</div>
            <Loader2 size={28} color={T.blue} style={{ animation:'tspin 1s linear infinite' }} />
          </div>
        </div>
      </>
    );
  }

  // ── REVIEW step ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="cap-page">
        <div className="scanline" />
        <header className="cap-header">
          <button onClick={handleBack} className="btn-icon"><ArrowLeft size={18} /></button>
          <div style={{ flex:1 }}>
            <div className="cap-title">REVIEW DOCUMENT<span className="t-cursor">_</span></div>
            {ocrConfidence !== null && (
              <div className="cap-sub">OCR CONFIDENCE: {Math.round(ocrConfidence * 100)}%</div>
            )}
          </div>
        </header>

        <main style={{ padding:16, paddingBottom:80 }}>
          {error && (
            <div className="err-bar"><AlertCircle size={18} />{error}</div>
          )}

          {/* Image preview */}
          {capturedImage && (
            <div className="t-card" style={{ padding:8 }}>
              <img src={capturedImage} alt="Invoice" style={{ width:'100%', borderRadius:4, maxHeight:200, objectFit:'contain' }} />
            </div>
          )}

          {/* Document type */}
          <div className="t-card">
            <div className="t-card-title">Document Type</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
              {DOC_TYPES.map(([val, label]) => (
                <button key={val} className={`t-pill${documentType===val?' active':''}`} onClick={() => setDocumentType(val)}>{label}</button>
              ))}
            </div>
            <label className="t-label">Doc / Reference No.</label>
            <input className="t-input" style={{ fontFamily:'Share Tech Mono,monospace' }} value={documentNumber||''} onChange={e => setDocumentNumber(e.target.value||null)} placeholder="e.g. INV-0042" />
          </div>

          {/* Invoice fields via InvoiceForm */}
          <div className="t-card">
            <div className="t-card-title">Document Details</div>
            <InvoiceForm formData={formData} onChange={setFormData} onSubmit={handleSave} isLoading={saving} submitLabel="Save Document" />
          </div>

          {/* Line items */}
          <div className="t-card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div className="t-card-title" style={{ margin:0 }}>Line Items</div>
              {invoiceTotal > 0 && (
                <span style={{ fontSize:10, letterSpacing:1, padding:'3px 8px', borderRadius:4, fontFamily:'Share Tech Mono,monospace', textTransform:'uppercase',
                  background: totalsMatch ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  color: totalsMatch ? T.success : T.error,
                  border: `1px solid ${totalsMatch ? T.success : T.error}`,
                }}>
                  {totalsMatch ? '✓ MATCH' : `⚠ ${fmtZAR(totalDiff)} OFF`}
                </span>
              )}
            </div>
            {lineItems.length === 0
              ? <div style={{ fontSize:12, color:T.textMuted, textAlign:'center', padding:'12px 0', letterSpacing:1 }}>[ NO LINE ITEMS ]</div>
              : lineItems.map((item, i) => (
                <div key={i} style={{ paddingBottom:10, marginBottom:10, borderBottom: i < lineItems.length-1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                    <input className="li-desc" value={item.description} onChange={e => updateItem(i,'description',e.target.value)} placeholder="Description" />
                    <button onClick={() => setLineItems(p => p.filter((_,j) => j!==i))} style={{ width:28, height:28, border:'none', background:'none', color:T.error, cursor:'pointer', borderRadius:4, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="number" className="li-num" style={{ width:65 }} value={item.quantity??''} onChange={e => updateItem(i,'quantity',e.target.value?Number(e.target.value):null)} placeholder="Qty" />
                    <input type="number" className="li-num" style={{ flex:1 }} value={item.unit_price??''} onChange={e => { const up=e.target.value?Number(e.target.value):null; updateItem(i,'unit_price',up); }} placeholder="Unit price" />
                    <input type="number" className="li-num" style={{ flex:1 }} value={item.line_total??''} onChange={e => updateItem(i,'line_total',e.target.value?Number(e.target.value):null)} placeholder="Total" />
                  </div>
                </div>
              ))
            }
            <button className="add-row-btn" onClick={() => setLineItems(p => [...p, {description:'',quantity:null,unit_price:null,line_total:null}])}>
              + Add Row
            </button>
            {lineItems.length > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, marginTop:4, borderTop:`1px solid ${T.border}` }}>
                <span style={{ fontSize:11, letterSpacing:2, color:T.textMuted, textTransform:'uppercase' }}>Items Total</span>
                <span style={{ fontFamily:'Share Tech Mono,monospace', color:T.yellow, fontSize:14 }}>{fmtZAR(itemsTotal)}</span>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="t-card">
            <div className="t-card-title">Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`t-pill${category===cat?' active':''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Project */}
          <div className="t-card">
            <div className="t-card-title">Project</div>
            {projects.length === 0 ? (
              <div style={{ fontSize:13, color:T.textMuted }}>No projects — <span onClick={() => router.push('/projects')} style={{ color:T.blue, cursor:'pointer' }}>create one</span></div>
            ) : (
              <div style={{ position:'relative' }}>
                <select className="t-select" value={projectId||''} onChange={e => setProjectId(e.target.value||null)}>
                  <option value="">-- No project --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:T.blue, pointerEvents:'none', fontSize:12 }}>▼</span>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="t-card">
            <div className="t-card-title">Payment</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isPaid ? 12 : 0 }}>
              <span style={{ fontSize:13, letterSpacing:1, color:T.textDim }}>MARK AS PAID</span>
              <button className="t-toggle" onClick={() => { setIsPaid(p=>!p); if(isPaid) setPaymentMethod(''); }}
                style={{ background: isPaid ? T.blue : T.border }}>
                <span className="t-toggle-thumb" style={{ left: isPaid ? 25 : 3 }} />
              </button>
            </div>
            {isPaid && (
              <div style={{ display:'flex', gap:8 }}>
                {['CASH','CARD','EFT'].map(m => (
                  <button key={m} className={`pay-btn${paymentMethod===m.toLowerCase()?' active':''}`} onClick={() => setPaymentMethod(m.toLowerCase())}>{m}</button>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}

export default function CapturePage() {
  return <Suspense><CapturePageInner /></Suspense>;
}
