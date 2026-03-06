'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import InvoiceForm from '@/components/InvoiceForm';
import { InvoiceFormData, OCRResult } from '@/types/invoice';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Camera, Upload, FileImage } from 'lucide-react';

type Step = 'choose' | 'capture' | 'processing' | 'review';

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
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [category, setCategory] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('invoice');
  const [documentNumber, setDocumentNumber] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<Array<{description:string;quantity:number|null;unit_price:number|null;line_total:number|null}>>([]);
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const loadProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id, name').eq('user_id', user?.id || '').order('name');
      setProjects(data || []);
    };
    loadProjects();
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
    setStep('processing');
    setError(null);
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
      setDocumentNumber(result.document_number || null);
      setLineItems(result.line_items || []);
      setStep('review');
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract data. Please fill in manually.');
      setStep('review');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let imageUrl = null;
      let imagePath = null;

      if (capturedImage) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = capturedImage.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices').upload(fileName, binaryData, { contentType: 'image/jpeg', upsert: false });
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
      <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => router.push('/invoices')} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Add Invoice</span>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 8px' }}>
            How would you like<br />to add an invoice?
          </h2>
          <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', margin: '0 0 28px' }}>
            Take a photo or upload an existing image
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
            <div onClick={() => setStep('capture')} style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={24} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Use Camera</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Take a photo of your invoice</div>
              </div>
            </div>

            <div onClick={() => fileInputRef.current?.click()} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={24} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Upload Image</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Choose a file from your device</div>
              </div>
            </div>

            <div onClick={() => fileInputRef.current?.click()} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileImage size={24} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>From Gallery</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Pick a photo from your gallery</div>
              </div>
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    );
  }

  if (step === 'capture') {
    return <CameraCapture onCapture={handleCapture} onClose={() => setStep('choose')} />;
  }

  if (step === 'processing') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Sparkles size={36} color="#2563eb" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Processing Invoice</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>AI is extracting your invoice data…</p>
          <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Review Document</div>
          {ocrConfidence !== null && (
            <div style={{ fontSize: 12, color: '#64748b' }}>AI Confidence: {Math.round(ocrConfidence * 100)}%</div>
          )}
        </div>
      </header>
      <main style={{ padding: 16 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, marginBottom: 16, color: '#be123c', fontSize: 14 }}>
            <AlertCircle size={18} />{error}
          </div>
        )}


        {/* Document Type + Number */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Document Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {[['invoice','Tax Invoice'],['quote','Quote'],['purchase_order','Purchase Order'],['credit_note','Credit Note'],['delivery_note','Delivery Note'],['receipt','Receipt']].map(([val, label]) => (
              <button key={val} onClick={() => setDocumentType(val)}
                style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  borderColor: documentType === val ? '#2563eb' : '#e2e8f0',
                  background: documentType === val ? '#eff6ff' : '#fff',
                  color: documentType === val ? '#2563eb' : '#64748b' }}>
                {label}
              </button>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Document / Reference Number</div>
            <input
              value={documentNumber || ''}
              onChange={e => setDocumentNumber(e.target.value || null)}
              placeholder="e.g. INV-0042"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Mono, monospace', color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
            />
          </div>
        </div>

        {/* Category */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Travel & Transport','Utilities','Materials & Supplies','Subscriptions & Software','Professional Services','Food & Entertainment','Equipment','Marketing','Other'].map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  borderColor: category === cat ? '#2563eb' : '#e2e8f0',
                  background: category === cat ? '#eff6ff' : '#fff',
                  color: category === cat ? '#2563eb' : '#64748b' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Line Items</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Description','Qty','Unit Price','Total'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Description' ? 'left' : 'right', padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '8px 8px', color: '#0f172a' }}>{item.description}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', color: '#64748b' }}>{item.quantity ?? '—'}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>{item.unit_price != null ? `R ${item.unit_price.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{item.line_total != null ? `R ${item.line_total.toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Project */}
        {projects.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Project</div>
            <select value={projectId || ''} onChange={e => setProjectId(e.target.value || null)}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#0f172a', outline: 'none', background: '#fff' }}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Payment */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Payment</div>
          
          {/* Paid toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isPaid ? 12 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>Paid?</span>
            <button
              onClick={() => { setIsPaid(!isPaid); if (isPaid) setPaymentMethod(''); }}
              style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: isPaid ? '#16a34a' : '#e2e8f0', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: 3, left: isPaid ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* Payment method */}
          {isPaid && (
            <div style={{ display: 'flex', gap: 8 }}>
              {['cash', 'card', 'eft'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid', borderColor: paymentMethod === method ? '#2563eb' : '#e2e8f0', background: paymentMethod === method ? '#eff6ff' : '#fff', color: paymentMethod === method ? '#2563eb' : '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.3px' }}
                >
                  {method}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16 }}>
          <InvoiceForm
            formData={formData}
            onChange={setFormData}
            onSubmit={handleSave}
            onCancel={handleBack}
            isLoading={saving}
            submitLabel="Save Invoice"
            imagePreview={capturedImage}
          />
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
