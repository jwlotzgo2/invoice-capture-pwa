'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import InvoiceForm from '@/components/InvoiceForm';
import { InvoiceFormData, OCRResult } from '@/types/invoice';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Camera, Upload, FileImage, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';
import { queueInvoice, requestSync } from '@/lib/offlineQueue';
import { logActivity } from '@/lib/logActivity';

type Step = 'choose' | 'capture' | 'processing' | 'review';

function CapturePageInner() {
  const [step, setStep] = useState<Step>('choose');
  const [showMore, setShowMore] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier: '', description: '', invoice_date: '',
    amount: '', vat_amount: '', products_services: '', business_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('image/jpeg');
  const [isOnline, setIsOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [category, setCategory] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('invoice');
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<Array<{description:string;quantity:number|null;unit_price:number|null;line_total:number|null}>>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const loadProjects = async () => {
      // getSession reads from local storage — works offline
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCachedUserId(session.user.id);
      if (!navigator.onLine) return; // skip network fetch when offline
      const { data } = await supabase.from('projects').select('id, name').eq('user_id', session?.user?.id || '').order('name');
      setProjects(data || []);
    };
    loadProjects();
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (searchParams.get('source') === 'upload') {
      const img = sessionStorage.getItem('uploadedInvoice');
      if (img) {
        sessionStorage.removeItem('uploadedInvoice');
        handleCapture(img);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setError(null);

    // Offline — skip OCR and review entirely, queue image immediately
    if (!navigator.onLine) {
      const uid = cachedUserId;
      if (!uid) { setError('Cannot save offline — open the app while connected first.'); return; }
      await queueInvoice({ image: imageData, userId: uid, formData: { document_type: 'invoice', doc_status: 'open', needs_ocr: true } });
      requestSync();
      logActivity('capture_offline');
      setToast('Image saved offline — OCR will run when reconnected');
      setTimeout(() => router.push('/offline'), 1500);
      return;
    }

    setStep('processing');
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      if (!response.ok) throw new Error('Failed to process image');
      const result: OCRResult = await response.json();
      setFormData({
        supplier: result.supplier || '', description: result.description || '',
        invoice_date: result.invoice_date || '', amount: result.amount?.toString() || '',
        vat_amount: result.vat_amount?.toString() || '',
        products_services: result.products_services || '', business_name: result.business_name || '',
      });
      setOcrConfidence(result.confidence);
      setCategory(result.category || null);
      setDocumentType(result.document_type || 'invoice');
      if (result.document_type && result.document_type !== 'invoice') setShowMore(true);
      setDocumentNumber(result.document_number || null);
      setLineItems(result.line_items || []);
      if (result.line_items && result.line_items.length > 0) {
        const lTotal = result.line_items.reduce((s: number, i: any) => s + (i.line_total ?? 0), 0);
        const excl = (result.amount ?? 0) - (result.vat_amount ?? 0);
        if (Math.abs(Math.round(lTotal * 100) - Math.round(excl * 100)) >= 2) setShowLines(true);
      }
      setStep('review');
      logActivity('capture_ocr', { confidence: result.confidence, document_type: result.document_type });
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract data. Please fill in manually.');
      setStep('review');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type || 'image/jpeg';
    setFileType(type);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const data = reader.result as string;
      // Offline — queue immediately, no OCR
      if (!navigator.onLine) {
        const uid = cachedUserId;
        if (!uid) { setError('Cannot save offline — open the app while connected first.'); return; }
        await queueInvoice({ image: data, userId: uid, formData: { document_type: type === 'application/pdf' ? 'invoice' : 'invoice', doc_status: 'open', needs_ocr: true } });
        requestSync();
        setToast('File saved offline — OCR will run when reconnected');
        setTimeout(() => router.push('/offline'), 1500);
        return;
      }
      if (type === 'application/pdf') {
        setCapturedImage(data);
        setStep('review');
      } else {
        handleCapture(data);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // ── Offline: queue locally and return ────────────────────────────
    if (!navigator.onLine) {
      const uid = cachedUserId;
      if (!uid) { setError('Cannot save offline — please reload the app while connected first.'); setSaving(false); return; }
      await queueInvoice({
        image: capturedImage,
        userId: uid,
        formData: {
          supplier: formData.supplier || null,
          description: formData.description || null,
          invoice_date: formData.invoice_date || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
          products_services: formData.products_services || null,
          business_name: formData.business_name || null,
          original_ocr_values: { ...formData },
          is_paid: isPaid,
          payment_method: isPaid && paymentMethod ? paymentMethod : null,
          document_type: documentType || 'invoice',
          doc_status: 'open',
          document_number: documentNumber || null,
          project_id: projectId || null,
          category: category || null,
          line_items: lineItems.length > 0 ? lineItems : null,
        },
      });
      requestSync();
      setSaving(false);
      setToast('Saved offline — will upload when reconnected');
      setTimeout(() => router.push('/offline'), 2000);
      return;
    }

    try {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      if (!user) throw new Error('Not authenticated');

      let imageUrl = null;
      let imagePath = null;

      if (capturedImage) {
        const isPdf = fileType === 'application/pdf';
        const ext = isPdf ? 'pdf' : 'jpg';
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const base64Data = capturedImage.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices').upload(fileName, binaryData, { contentType: fileType, upsert: false });
        if (uploadError) throw uploadError;
        imagePath = uploadData.path;
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(imagePath);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('invoices').insert({
        user_id: user.id,
        supplier: formData.supplier || null, description: formData.description || null,
        invoice_date: formData.invoice_date || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        products_services: formData.products_services || null,
        business_name: formData.business_name || null,
        image_url: imageUrl, image_path: imagePath,
        original_ocr_values: { ...formData },
        source: 'camera', status: 'pending',
        is_paid: isPaid,
        payment_method: isPaid && paymentMethod ? paymentMethod : null,
        document_type: documentType || 'invoice',
        doc_status: 'open',
        document_number: documentNumber || null,
        project_id: projectId || null,
        category: category || null,
        line_items: lineItems.length > 0 ? lineItems : null,
      }).select().single();

      if (insertError) throw insertError;
      router.push('/invoices');
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'review' || step === 'capture') {
      setStep('choose');
      setCapturedImage(null);
    } else {
      router.push('/invoices');
    }
  };

  if (step === 'choose') {
    return (
      <div style={{ minHeight: '100svh', background: '#1c1c1c', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#282828', borderBottom: '1px solid #383838' }}>
          <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a8a', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#f0f0f0' }}>Add Document</span>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f0', textAlign: 'center', margin: '0 0 8px' }}>
            How would you like<br />to add a document?
          </h2>
          <p style={{ fontSize: 14, color: '#8a8a8a', textAlign: 'center', margin: '0 0 28px' }}>
            Camera, gallery or file
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
            {/* Camera */}
            <div onClick={() => setStep('capture')} style={{ background: '#282828', border: '1px solid #383838', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={22} color="#1c1c1c" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 2 }}>Camera</div>
                <div style={{ fontSize: 12, color: '#8a8a8a' }}>Take a photo of your document</div>
              </div>
            </div>

            {/* Gallery — images only */}
            <div onClick={() => imageInputRef.current?.click()} style={{ background: '#282828', border: '1px solid #383838', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: '#323232', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileImage size={22} color="#e5e5e5" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 2 }}>Gallery</div>
                <div style={{ fontSize: 12, color: '#8a8a8a' }}>Pick an image from your gallery</div>
              </div>
            </div>

            {/* Files — PDF + docs */}
            <div onClick={() => fileInputRef.current?.click()} style={{ background: '#282828', border: '1px solid #383838', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: '#323232', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={22} color="#e5e5e5" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 2 }}>Upload File</div>
                <div style={{ fontSize: 12, color: '#8a8a8a' }}>PDF or document from your files</div>
              </div>
            </div>
          </div>
        </div>

        {/* Images only — opens gallery */}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        {/* Files — PDF and docs */}
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.heic,.heif" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    );
  }

  if (step === 'capture') {
    return <CameraCapture onCapture={handleCapture} onClose={() => setStep('choose')} />;
  }

  if (step === 'processing') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c1c1c', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#323232', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Sparkles size={36} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', margin: '0 0 8px' }}>Processing Invoice</h2>
          <p style={{ fontSize: 14, color: '#8a8a8a', margin: '0 0 24px' }}>AI is extracting your invoice data…</p>
          <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: '#1c1c1c', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 999, background: '#282828', border: '1px solid #383838', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <WifiOff size={16} color="#fdba74" />
          <span style={{ fontSize: 13, color: '#f0f0f0', flex: 1 }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#6b6b6b', cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
      )}
      {!isOnline && (
        <div style={{ background: '#1c1c1c', borderBottom: '1px solid #383838', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <WifiOff size={13} color="#fdba74" />
          <span style={{ fontSize: 12, color: '#fdba74' }}>You're offline — invoice will be saved locally and uploaded when reconnected</span>
        </div>
      )}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#282828', borderBottom: '1px solid #383838', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a8a', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f0f0' }}>Review Document</div>
          {ocrConfidence !== null && (
            <div style={{ fontSize: 12, color: '#8a8a8a' }}>AI Confidence: {Math.round(ocrConfidence * 100)}%</div>
          )}
        </div>
      </header>
      <main style={{ padding: 16 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, marginBottom: 16, color: '#be123c', fontSize: 14 }}>
            <AlertCircle size={18} />{error}
          </div>
        )}


        {/* Main fields */}
        <div style={{ background: '#282828', borderRadius: 14, border: '1px solid #383838', padding: 16, marginBottom: 12 }}>
          <InvoiceForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleSave}
            onCancel={handleBack}
            isLoading={saving}
            submitLabel="Save Invoice"
            imagePreview={fileType === 'application/pdf' ? null : capturedImage}
            pdfPreview={fileType === 'application/pdf' ? capturedImage : null}
          />
        </div>

        {/* Project — inline chips */}
        <div style={{ background: '#282828', borderRadius: 14, border: '1px solid #383838', padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', flexShrink: 0 }}>Project</span>
            {projects.length === 0 ? (
              <span style={{ fontSize: 12, color: '#6b6b6b' }}>No projects — <span onClick={() => router.push('/projects')} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>create one</span></span>
            ) : (
              <>
                <button onClick={() => setProjectId(null)}
                  style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: !projectId ? '#2563eb' : '#383838', background: !projectId ? 'rgba(37,99,235,0.15)' : 'transparent', color: !projectId ? '#60a5fa' : '#6b6b6b' }}>
                  None
                </button>
                {projects.map(p => (
                  <button key={p.id} onClick={() => setProjectId(p.id)}
                    style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      borderColor: projectId === p.id ? '#2563eb' : '#383838', background: projectId === p.id ? 'rgba(37,99,235,0.15)' : 'transparent', color: projectId === p.id ? '#60a5fa' : '#8a8a8a' }}>
                    {p.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Payment — inline toggle + chips */}
        <div style={{ background: '#282828', borderRadius: 14, border: '1px solid #383838', padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', flexShrink: 0 }}>Paid?</span>
            <button onClick={() => { setIsPaid(!isPaid); if (isPaid) setPaymentMethod(''); }}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: isPaid ? '#16a34a' : '#383838', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: isPaid ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s' }} />
            </button>
            {isPaid && ['cash','card','eft'].map(method => (
              <button key={method} onClick={() => setPaymentMethod(method)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.3px',
                  borderColor: paymentMethod === method ? '#2563eb' : '#383838', background: paymentMethod === method ? 'rgba(37,99,235,0.15)' : 'transparent', color: paymentMethod === method ? '#60a5fa' : '#6b6b6b' }}>
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Line Items — collapsible, highlights mismatch */}
        {(() => {
          const linesTotal = lineItems.reduce((s, i) => s + (i.line_total ?? 0), 0);
          const invAmount = parseFloat(formData.amount || '0') || 0;
          const invVat = parseFloat(formData.vat_amount || '0') || 0;
          const exclTotal = invAmount - invVat;
          const hasMismatch = lineItems.length > 0 && invAmount > 0 && Math.abs(Math.round(linesTotal * 100) - Math.round(exclTotal * 100)) >= 2;
          return (
            <div style={{ background: '#282828', borderRadius: 14, border: `1px solid ${hasMismatch ? 'rgba(253,186,116,0.5)' : '#383838'}`, marginBottom: 12, overflow: 'hidden' }}>
              <button onClick={() => setShowLines(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>Line Items</span>
                  {lineItems.length > 0 && !hasMismatch && (
                    <span style={{ fontSize: 10, background: 'rgba(134,239,172,0.12)', color: '#86efac', border: '1px solid rgba(134,239,172,0.3)', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✓ {lineItems.length} lines matched</span>
                  )}
                  {hasMismatch && (
                    <span style={{ fontSize: 10, background: 'rgba(253,186,116,0.12)', color: '#fdba74', border: '1px solid rgba(253,186,116,0.3)', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>⚠ Mismatch · R{Math.round(Math.abs(linesTotal - exclTotal)).toLocaleString('en-ZA')}</span>
                  )}
                  {lineItems.length === 0 && (
                    <span style={{ fontSize: 11, color: '#6b6b6b' }}>none</span>
                  )}
                </div>
                {showLines ? <ChevronUp size={15} color="#8a8a8a" /> : <ChevronDown size={15} color="#8a8a8a" />}
              </button>
              {showLines && (
                <div style={{ borderTop: '1px solid #383838', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <button onClick={() => setLineItems(prev => [...prev, { description: '', quantity: null, unit_price: null, line_total: null }])}
                      style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add row
                    </button>
                  </div>
                  {lineItems.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#6b6b6b', textAlign: 'center', padding: '12px 0' }}>No line items — tap Add row to add one</div>
                  ) : lineItems.map((item, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < lineItems.length - 1 ? '1px solid #383838' : 'none' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <input value={item.description}
                          onChange={e => setLineItems(prev => prev.map((r, j) => j === i ? { ...r, description: e.target.value } : r))}
                          placeholder="Description"
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid #383838', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', background: '#1c1c1c', color: '#f0f0f0' }} />
                        <button onClick={() => setLineItems(prev => prev.filter((_, j) => j !== i))}
                          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={item.quantity ?? ''} onChange={e => setLineItems(prev => prev.map((r, j) => j === i ? { ...r, quantity: e.target.value ? Number(e.target.value) : null } : r))}
                          placeholder="Qty" style={{ width: 70, padding: '7px 8px', border: '1px solid #383838', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', textAlign: 'right', background: '#1c1c1c', color: '#f0f0f0' }} />
                        <input type="number" value={item.line_total ?? ''} onChange={e => setLineItems(prev => prev.map((r, j) => j === i ? { ...r, line_total: e.target.value ? Number(e.target.value) : null } : r))}
                          placeholder="Line total" style={{ flex: 1, padding: '7px 8px', border: '1px solid #383838', borderRadius: 8, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', textAlign: 'right', background: '#1c1c1c', color: '#f0f0f0' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* More Options — collapsible */}
        <div style={{ background: '#282828', borderRadius: 14, border: '1px solid #383838', marginBottom: 12, overflow: 'hidden' }}>
          <button onClick={() => setShowMore(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>More options</span>
              {(documentType && documentType !== 'invoice') || category ? (
                <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                  {[documentType !== 'invoice' ? documentType?.replace('_',' ') : null, category].filter(Boolean).join(' · ')}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#6b6b6b' }}>doc type, category</span>
              )}
            </div>
            {showMore ? <ChevronUp size={15} color="#8a8a8a" /> : <ChevronDown size={15} color="#8a8a8a" />}
          </button>
          {showMore && (
            <div style={{ borderTop: '1px solid #383838', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Document Type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[['invoice','Tax Invoice'],['quote','Quote'],['purchase_order','Purchase Order'],['credit_note','Credit Note'],['delivery_note','Delivery Note'],['receipt','Receipt']].map(([val, label]) => (
                    <button key={val} onClick={() => setDocumentType(val)}
                      style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: documentType === val ? '#2563eb' : '#383838', background: documentType === val ? 'rgba(37,99,235,0.15)' : 'transparent', color: documentType === val ? '#60a5fa' : '#8a8a8a' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Document / Reference Number</div>
                <input value={documentNumber || ''} onChange={e => setDocumentNumber(e.target.value || null)} placeholder="e.g. INV-0042"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #383838', borderRadius: 10, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif', color: '#f0f0f0', outline: 'none', boxSizing: 'border-box', background: '#1c1c1c' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Category</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software','Professional Services','Food & Entertainment','Equipment','Marketing','Other'].map(cat => (
                    <button key={cat} onClick={() => setCategory(prev => prev === cat ? null : cat)}
                      style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: category === cat ? '#2563eb' : '#383838', background: category === cat ? 'rgba(37,99,235,0.15)' : 'transparent', color: category === cat ? '#60a5fa' : '#8a8a8a' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense>
      <CapturePageInner />
    </Suspense>
  );
}
