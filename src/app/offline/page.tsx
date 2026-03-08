'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FileImage, Upload, Wifi, WifiOff, Clock } from 'lucide-react';
import { queueInvoice, getPendingCount, requestSync } from '@/lib/offlineQueue';
import { createClient } from '@/lib/supabase/client';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  primary: '#e5e5e5', warning: '#fdba74', success: '#86efac', error: '#fca5a5',
};

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [cachedUserId, setCachedUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => { setIsOnline(true); router.push('/'); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    // Load cached user id and pending count
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCachedUserId(session.user.id);
    });
    getPendingCount().then(setPendingCount);

    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const queueImage = async (dataUrl: string) => {
    if (!cachedUserId) { showToast('Session expired — please reconnect and log in again'); return; }
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
    // Use file input with capture attribute for camera
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => queueImage(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => queueImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ minHeight: '100svh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Go Capture</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(253,186,116,0.1)', border: `1px solid rgba(253,186,116,0.3)` }}>
          <WifiOff size={12} color={T.warning} />
          <span style={{ fontSize: 11, color: T.warning }}>Offline</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px', gap: 24, maxWidth: 400, margin: '0 auto', width: '100%' }}>

        {/* Status */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>You're offline</div>
          <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
            You can still capture documents — they'll upload and be processed automatically when you reconnect.
          </div>
        </div>

        {/* Pending badge */}
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(134,239,172,0.08)', border: `1px solid rgba(134,239,172,0.25)`, borderRadius: 10 }}>
            <Clock size={16} color={T.success} />
            <span style={{ fontSize: 13, color: T.success }}>{pendingCount} document{pendingCount > 1 ? 's' : ''} queued — waiting to upload</span>
          </div>
        )}

        {/* Capture options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Capture a document</div>

          <button onClick={handleCamera} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Camera size={20} color={T.bg} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>Camera</div>
              <div style={{ fontSize: 12, color: T.textDim }}>Take a photo of your document</div>
            </div>
          </button>

          <button onClick={() => imageInputRef.current?.click()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileImage size={20} color={T.primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>Gallery</div>
              <div style={{ fontSize: 12, color: T.textDim }}>Pick an image from your gallery</div>
            </div>
          </button>

          <button onClick={() => fileInputRef.current?.click()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={20} color={T.primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>Upload File</div>
              <div style={{ fontSize: 12, color: T.textDim }}>PDF or document from your files</div>
            </div>
          </button>
        </div>

        {/* Reconnect hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <Wifi size={14} color={T.textMuted} />
          <span style={{ fontSize: 12, color: T.textMuted }}>When reconnected, the app will reopen automatically and sync your documents.</span>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.heic,.heif" onChange={handleFile} style={{ display: 'none' }} />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16, zIndex: 999, background: T.surface, border: `1px solid ${T.success}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          <Clock size={14} color={T.success} />
          <span style={{ fontSize: 13, color: T.text }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
