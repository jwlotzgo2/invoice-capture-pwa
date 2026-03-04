'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import InvoiceForm from '@/components/InvoiceForm';
import { InvoiceFormData, OCRResult } from '@/types/invoice';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Camera, Upload, FileImage } from 'lucide-react';

type Step = 'choose' | 'capture' | 'processing' | 'review';

export default function CapturePage() {
  const [step, setStep] = useState<Step>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier: '', description: '', invoice_date: '',
    amount: '', vat_amount: '', products_services: '', business_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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

      const { data: invoice, error: insertError } = await supabase.from('invoices').insert({
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

  // ── Choose ─────────────────────────────────────────────────────────────────
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
            {/* Camera */}
            <div onClick={() => setStep('capture')} style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={24} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Use Camera</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Take a photo of your invoice</div>
              </div>
            </div>

            {/* Upload */}
            <div onClick={() => fileInputRef.current?.click()} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={24} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Upload Image</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Choose a file from your device</div>
              </div>
            </div>

            {/* Gallery */}
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

  // ── Camera ─────────────────────────────────────────────────────────────────
  if (step === 'capture') {
    return <CameraCapture onCapture={handleCapture} onClose={() => setStep('choose')} />;
  }

  // ── Processing ─────────────────────────────────────────────────────────────
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

  // ── Review ─────────────────────────────────────────────────────────────────
  // InvoiceForm has its own Save + Cancel buttons — no extra buttons here
  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, background: '#fff',
        borderBottom: '1px solid #e2e8f0', padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Review Invoice</div>
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
