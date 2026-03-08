'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import { InvoiceFormData, OCRResult } from '@/types/invoice';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Camera, Upload, FileImage, ZoomIn, X } from 'lucide-react';

type Step = 'choose' | 'capture' | 'processing' | 'review';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
};

const css = `
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .cap-page { min-height:100svh;background:${T.bg};font-family:Inter, system-ui, sans-serif,Inter, system-ui, sans-serif;color:${T.text}; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);pointer-events:none;z-index:1000; }
  .cap-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:12px 16px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .cap-title { font-family:Inter, system-ui, sans-serif;font-size:22px;letter-spacing:0.3px;color:${T.yellow};text-shadow:0 0 10px rgba(229,229,229,0.12);flex:1; }
  .cap-sub { font-size:11px;color:${T.text};letter-spacing:0.2px; }
  .btn-icon { width:38px;height:38px;border-radius:6px;border:1px solid ${T.border};background:transparent;color:${T.textDim};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s; }
  .btn-icon:hover { border-color:${T.blue};color:${T.blue}; }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .t-card-title { font-family:Inter, system-ui, sans-serif;font-size:16px;letter-spacing:0.3px;color:${T.yellow};text-transform:none;margin-bottom:12px;display:flex;align-items:center;gap:6px; }
  .t-card-title::before { content:'>';color:${T.blue}; }
  .t-label { font-size:10px;letter-spacing:0.3px;color:${T.text};text-transform:none;margin-bottom:5px;display:block; }
  .t-input { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s; }
  .t-input:focus { border-color:${T.blue};box-shadow:0 0 0 2px ${T.blueGlow}; }
  .t-input::placeholder { color:${T.textMuted}; }
  .t-input.mono { color:${T.yellow}; }
  .t-select { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:13px;outline:none;appearance:none;cursor:pointer; }
  .t-select:focus { border-color:${T.blue}; }
  .t-textarea { width:100%;padding:9px 12px;background:${T.bg};border:1px solid ${T.border};border-radius:4px;color:${T.text};font-family:Inter, system-ui, sans-serif;font-size:14px;outline:none;resize:vertical;min-height:70px; }
  .t-textarea:focus { border-color:${T.blue};box-shadow:0 0 0 2px ${T.blueGlow}; }
  .t-textarea::placeholder { color:${T.textMuted}; }
  .save-btn { width:100%;padding:14px;background:${T.yellow};border:none;border-radius:6px;color:${T.bg};font-family:Inter, system-ui, sans-serif;font-size:20px;letter-spacing:0.3px;cursor:pointer;text-transform:none;box-shadow:0 0 20px rgba(229,229,229,0.12);transition:box-shadow 0.2s,transform 0.1s; }
  .save-btn:hover { box-shadow:0 0 30px rgba(250,204,21,0.5);transform:translateY(-1px); }
  .save-btn:disabled { opacity:0.5;cursor:default;transform:none; }
  .cancel-btn { width:100%;padding:11px;background:transparent;border:1px solid ${T.border};border-radius:6px;color:${T.textDim};font-family:Inter, system-ui, sans-serif;font-size:13px;letter-spacing:0.2px;cursor:pointer;margin-top:8px; }
  .cancel-btn:hover { border-color:${T.textDim};color:${T.text}; }
  .err-bar { display:flex;align-items:center;gap:8px;padding:12px;background:rgba(252,165,165,0.12);border:1px solid ${T.error};border-radius:6px;margin-bottom:16px;color:${T.error};font-size:13px; }
  .dupe-bar { display:flex;align-items:center;gap:8px;padding:12px;background:rgba(253,186,116,0.12);border:1px solid ${T.warning};border-radius:6px;margin-bottom:16px;color:${T.warning};font-size:13px; }
  .img-wrap { position:relative;cursor:pointer; }
  .img-zoom-btn { position:absolute;bottom:8px;right:8px;width:32px;height:32px;border-radius:6px;background:rgba(0,0,0,0.6);border:1px solid ${T.border};display:flex;align-items:center;justify-content:center;color:${T.text};cursor:pointer;transition:background 0.2s; }
  .img-zoom-btn:hover { background:rgba(99,102,241,0.4); }
  .lightbox { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:2000;display:flex;align-items:center;justify-content:center; }
  .lightbox-close { position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid ${T.border};display:flex;align-items:center;justify-content:center;color:${T.text};cursor:pointer; }
  .lightbox img { max-width:95vw;max-height:90vh;object-fit:contain;touch-action:pinch-zoom; }
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
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id,name').eq('user_id', user?.id||'').order('name');
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
      const res = await fetch('/api/ocr', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: imageData }) });
      if (!res.ok) throw new Error('Failed to process image');
      const result: OCRResult = await res.json();
      setFormData({
        supplier: result.supplier||'', description: result.description||'',
        invoice_date: result.invoice_date||'', amount: result.amount?.toString()||'',
        vat_amount: result.vat_amount?.toString()||'', products_services: result.products_services||'',
        business_name: result.business_name||'',
      });
      setOcrConfidence(result.confidence);
      setDocumentNumber(result.document_number || null);
      setStep('review');
      // Check for duplicates after OCR
      checkDuplicate(result.supplier, result.amount, result.invoice_date, result.document_number);
    } catch {
      setError('Failed to extract data. Please fill in manually.'); setStep('review');
    }
  };

  const checkDuplicate = async (supplier?: string|null, amount?: number|null, date?: string|null, docNum?: string|null) => {
    const { data: { user } } = await supabase.auth.getUser();
    let dupeFound = false;
    if (docNum) {
      const { data } = await supabase.from('invoices').select('id,supplier').eq('user_id', user?.id||'').eq('document_number', docNum).limit(1);
      if (data && data.length > 0) { setDuplicateWarning(`Doc ref ${docNum} already exists`); dupeFound = true; }
    }
    if (!dupeFound && supplier && amount && date) {
      const { data } = await supabase.from('invoices').select('id').eq('user_id', user?.id||'').eq('supplier', supplier).eq('amount', amount).eq('invoice_date', date).limit(1);
      if (data && data.length > 0) { setDuplicateWarning(`Possible duplicate — same supplier, amount and date already on file`); }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Re-check duplicate when fields change
  useEffect(() => {
    if (step !== 'review') return;
    const t = setTimeout(() => {
      checkDuplicate(formData.supplier, formData.amount ? parseFloat(formData.amount) : null, formData.invoice_date, documentNumber);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.supplier, formData.amount, formData.invoice_date, documentNumber]);

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
        const { data: uploadData, error: uploadError } = await supabase.storage.from('invoices').upload(fileName, binaryData, { contentType:'image/jpeg', upsert:false });
        if (uploadError) throw uploadError;
        imagePath = uploadData.path;
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(imagePath);
        imageUrl = urlData.publicUrl;
      }
      const { error: insertError } = await supabase.from('invoices').insert({
        user_id: user.id,
        supplier: formData.supplier||null, description: formData.description||null,
        invoice_date: formData.invoice_date||null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        products_services: formData.products_services||null, business_name: formData.business_name||null,
        image_url: imageUrl, image_path: imagePath, original_ocr_values: { ...formData },
        source: 'camera', status: 'pending',
        document_number: documentNumber||null,
        project_id: projectId||null,
        document_type: 'invoice', doc_status: 'open',
      });
      if (insertError) throw insertError;
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleBack = () => {
    if (step === 'review' || step === 'capture') { setStep('choose'); setCapturedImage(null); }
    else router.push('/');
  };

  const fc = (field: keyof InvoiceFormData, val: string) => setFormData(p => ({ ...p, [field]: val }));
  const focusBlue = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => { e.target.style.borderColor=T.blue; e.target.style.boxShadow=`0 0 0 2px ${T.blueGlow}`; };
  const blurReset = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; };
  const focusYellow = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor=T.yellow; e.target.style.boxShadow=`0 0 0 2px ${T.yellowGlow}`; };

  // ── CHOOSE ───────────────────────────────────────────────────────────────────
  if (step === 'choose') return (
    <>
      <style>{css}</style>
      <div className="cap-page">
        <div className="scanline" />
        <header className="cap-header">
          <button onClick={() => router.push('/')} className="btn-icon"><ArrowLeft size={18}/></button>
          <span className="cap-title">GO CAPTURE</span>
        </header>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px'}}>
          <div style={{fontFamily:'Inter, system-ui, sans-serif',fontSize:16,letterSpacing:0.5,color:T.textMuted,marginBottom:24,textTransform:'none'}}>Select Capture Method</div>
          <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',maxWidth:360}}>
            {[
              { icon:<Camera size={22} color={T.bg}/>, label:'Use Camera', sub:'Take a photo', action:()=>setStep('capture'), primary:true },
              { icon:<Upload size={22} color={T.blue}/>, label:'Upload Image', sub:'Choose from device', action:()=>fileInputRef.current?.click(), primary:false },
              { icon:<FileImage size={22} color={T.blue}/>, label:'From Gallery', sub:'Pick from gallery', action:()=>fileInputRef.current?.click(), primary:false },
            ].map(({icon,label,sub,action,primary}) => (
              <div key={label} onClick={action} style={{background:primary?T.yellow:T.surface,border:primary?'none':`1px solid ${T.border}`,borderRadius:8,padding:'18px 20px',display:'flex',alignItems:'center',gap:16,cursor:'pointer',boxShadow:primary?'0 0 20px rgba(250,204,21,0.25)':'none'}}>
                <div style={{width:48,height:48,borderRadius:6,background:primary?'rgba(0,0,0,0.15)':T.blueGlow,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icon}</div>
                <div>
                  <div style={{fontSize:15,fontFamily:'Inter, system-ui, sans-serif',letterSpacing:0.5,color:primary?T.bg:T.text,marginBottom:2}}>{label.toUpperCase()}</div>
                  <div style={{fontSize:12,color:primary?'rgba(0,0,0,0.5)':T.textMuted}}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{display:'none'}} />
      </div>
    </>
  );

  if (step === 'capture') return <CameraCapture onCapture={handleCapture} onClose={()=>setStep('choose')} />;

  // ── PROCESSING ───────────────────────────────────────────────────────────────
  if (step === 'processing') return (
    <>
      <style>{css}</style>
      <div className="cap-page" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div className="scanline" />
        <div style={{textAlign:'center',padding:'0 24px'}}>
          <div style={{width:80,height:80,borderRadius:8,border:`1px solid ${T.blue}`,background:`rgba(99,102,241,0.1)`,display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:24}}>
            <Sparkles size={36} color={T.blue}/>
          </div>
          <div style={{fontFamily:'Inter, system-ui, sans-serif',fontSize:24,letterSpacing:0.5,color:T.yellow,marginBottom:8}}>PROCESSING…</div>
          <div style={{fontSize:12,color:T.textDim,letterSpacing:1,marginBottom:24}}>AI IS EXTRACTING DATA</div>
          <Loader2 size={28} color={T.blue} style={{animation:'tspin 1s linear infinite'}}/>
        </div>
      </div>
    </>
  );

  // ── REVIEW ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="cap-page">
        <div className="scanline" />
        <header className="cap-header">
          <button onClick={handleBack} className="btn-icon"><ArrowLeft size={18}/></button>
          <div style={{flex:1}}>
            <div className="cap-title">REVIEW</div>
            {ocrConfidence !== null && <div className="cap-sub">OCR CONFIDENCE: {Math.round(ocrConfidence*100)}%</div>}
          </div>
        </header>

        <main style={{padding:16,paddingBottom:80}}>
          {error && <div className="err-bar"><AlertCircle size={18}/>{error}</div>}
          {duplicateWarning && (
            <div className="dupe-bar">
              <span style={{fontSize:16}}>⚡</span>
              <span>{duplicateWarning}</span>
              <button onClick={()=>setDuplicateWarning(null)} style={{marginLeft:'auto',background:'none',border:'none',color:T.warning,cursor:'pointer',padding:0}}><X size={14}/></button>
            </div>
          )}

          {/* Image preview with zoom */}
          {capturedImage && (
            <div className="t-card" style={{padding:8,marginBottom:12}}>
              <div className="img-wrap" onClick={()=>setLightboxOpen(true)}>
                <img src={capturedImage} alt="Invoice" style={{width:'100%',borderRadius:4,maxHeight:220,objectFit:'contain',display:'block'}}/>
                <button className="img-zoom-btn" onClick={e=>{e.stopPropagation();setLightboxOpen(true);}}><ZoomIn size={16}/></button>
              </div>
            </div>
          )}

          {/* Document details */}
          <div className="t-card">
            <div className="t-card-title">Document Details</div>

            <div style={{marginBottom:12}}>
              <label className="t-label">Doc / Reference No.</label>
              <input className="t-input" style={{fontFamily:'Inter, system-ui, sans-serif'}} value={documentNumber||''} onChange={e=>setDocumentNumber(e.target.value||null)} placeholder="e.g. INV-0042" onFocus={focusBlue} onBlur={blurReset}/>
            </div>

            {[
              {label:'Supplier', key:'supplier', type:'text'},
              {label:'Business Name', key:'business_name', type:'text'},
              {label:'Invoice Date', key:'invoice_date', type:'date'},
            ].map(({label,key,type}) => (
              <div key={key} style={{marginBottom:12}}>
                <label className="t-label">{label}</label>
                <input type={type} className="t-input" value={formData[key as keyof InvoiceFormData]} onChange={e=>fc(key as keyof InvoiceFormData, e.target.value)} placeholder={label} onFocus={focusBlue} onBlur={blurReset}/>
              </div>
            ))}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {[{label:'Amount (incl. VAT)',key:'amount'},{label:'VAT Amount',key:'vat_amount'}].map(({label,key}) => (
                <div key={key}>
                  <label className="t-label">{label}</label>
                  <input type="number" className="t-input mono" value={formData[key as keyof InvoiceFormData]} onChange={e=>fc(key as keyof InvoiceFormData, e.target.value)} placeholder="0" onFocus={focusYellow} onBlur={blurReset}/>
                </div>
              ))}
            </div>

            <div style={{marginBottom:12}}>
              <label className="t-label">Description</label>
              <textarea className="t-textarea" value={formData.description} onChange={e=>fc('description',e.target.value)} placeholder="Invoice description" onFocus={focusBlue} onBlur={blurReset}/>
            </div>

            <div>
              <label className="t-label">Products / Services</label>
              <textarea className="t-textarea" value={formData.products_services} onChange={e=>fc('products_services',e.target.value)} placeholder="Products or services" onFocus={focusBlue} onBlur={blurReset}/>
            </div>
          </div>

          {/* Project */}
          <div className="t-card">
            <div className="t-card-title">Project</div>
            {projects.length === 0 ? (
              <div style={{fontSize:13,color:T.textMuted}}>No projects — <span onClick={()=>router.push('/projects')} style={{color:T.blue,cursor:'pointer'}}>create one</span></div>
            ) : (
              <div style={{position:'relative'}}>
                <select className="t-select" value={projectId||''} onChange={e=>setProjectId(e.target.value||null)}>
                  <option value="">-- No project --</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',color:T.blue,pointerEvents:'none',fontSize:12}}>▼</span>
              </div>
            )}
          </div>

          <div style={{marginTop:4}}>
            <button className="save-btn" disabled={saving} onClick={handleSave}>
              {saving ? 'SAVING…' : 'SAVE DOCUMENT'}
            </button>
            <button className="cancel-btn" onClick={handleBack}>Cancel</button>
          </div>
        </main>

        {/* Lightbox */}
        {lightboxOpen && capturedImage && (
          <div className="lightbox" onClick={()=>setLightboxOpen(false)}>
            <button className="lightbox-close"><X size={20}/></button>
            <img src={capturedImage} alt="Invoice" onClick={e=>e.stopPropagation()}/>
          </div>
        )}
      </div>
    </>
  );
}

export default function CapturePage() {
  return <Suspense><CapturePageInner /></Suspense>;
}
