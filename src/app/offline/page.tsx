'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, FileImage, Upload, Wifi, WifiOff, Clock } from 'lucide-react';
import { queueInvoice, getPendingCount, requestSync } from '@/lib/offlineQueue';
import { createClient } from '@/lib/supabase/client';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  primary: '#e5e5e5', warning: '#fdba74', success: '#86efac',
};

export default function OfflinePage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCachedUserId(session.user.id);
    });
    getPendingCount().then(setPendingCount);
    // No online/offline listeners here — SyncManager in layout handles those
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const queueImage = async (dataUrl: string) => {
    if (!cachedUserId) { showToast('Session expired — reconnect and log in again'); return; }
    await queueInvoice({
      image: dataUrl,
      userId: cachedUserId,
      formData: { document_type: 'invoice', doc_status: 'open', needs_ocr: true },
    });
    requestSync();
    const count = await getPendingCount();
    setPendingCount(count);
    showToast('Saved — will upload and process when reconnected');
  };

  const handleCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => queueImage(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => queueImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Go Capture</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(253,186,116,0.1)', border: `1px solid rgba(253,186,116,0.3)` }}>
          <WifiOff size={12} color={T.warning} />
          <span style={{ fontSize: 11, color: T.warning }}>Offline</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px', gap: 20, maxWidth: 400, margin: '0 auto', width: '100%' }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>You're offline</div>
          <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
            Capture documents below — they'll upload and be OCR processed automatically when you reconnect.
          </div>
        </div>

        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(134,239,172,0.08)', border: `1px solid rgba(134,239,172,0.25)`, borderRadius: 10 }}>
            <Clock size={15} color={T.success} />
            <span style={{ fontSize: 13, color: T.success }}>{pendingCount} document{pendingCount > 1 ? 's' : ''} queued — waiting to upload</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Capture a document</div>

          {[
            { label: 'Camera', sub: 'Take a photo of your document', icon: <Camera size={20} color={T.bg} />, bg: T.primary, onClick: handleCamera },
            { label: 'Gallery', sub: 'Pick an image from your gallery', icon: <FileImage size={20} color={T.primary} />, bg: T.surfaceHigh, onClick: () => imageInputRef.current?.click() },
            { label: 'Upload File', sub: 'PDF or document from your files', icon: <Upload size={20} color={T.primary} />, bg: T.surfaceHigh, onClick: () => fileInputRef.current?.click() },
          ].map(({ label, sub, icon, bg, onClick }) => (
            <button key={label} onClick={onClick} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: T.textDim }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 4 }}>
          <Wifi size={14} color={T.textMuted} />
          <span style={{ fontSize: 12, color: T.textMuted }}>You'll be taken back to the app automatically when reconnected.</span>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.heic,.heif" onChange={handleFile} style={{ display: 'none' }} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, zIndex: 999, background: T.surface, border: `1px solid ${T.success}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          <Clock size={14} color={T.success} />
          <span style={{ fontSize: 13, color: T.text }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
