'use client';

import { useEffect, useState } from 'react';
import { syncPendingInvoices } from '@/lib/syncInvoices';
import { WifiOff, Wifi } from 'lucide-react';

export default function SyncManager() {
  const [toast, setToast] = useState<{ msg: string; type: 'online' | 'offline' } | null>(null);

  const showToast = (msg: string, type: 'online' | 'offline') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleOnline = async () => {
      const { synced } = await syncPendingInvoices();
      if (synced > 0) {
        showToast(`${synced} offline invoice${synced > 1 ? 's' : ''} uploaded`, 'online');
      } else {
        showToast('Back online', 'online');
      }
    };

    const handleOffline = () => {
      showToast('You\'re offline — captures will be saved locally', 'offline');
    };

    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_INVOICES') {
        const { synced } = await syncPendingInvoices();
        if (synced > 0) showToast(`${synced} invoice${synced > 1 ? 's' : ''} synced`, 'online');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Sync any pending on mount
    if (navigator.onLine) syncPendingInvoices();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 9999,
      background: '#282828', border: `1px solid ${toast.type === 'online' ? '#86efac' : '#fdba74'}`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.2s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>
      {toast.type === 'online'
        ? <Wifi size={16} color="#86efac" />
        : <WifiOff size={16} color="#fdba74" />}
      <span style={{ fontSize: 13, color: '#f0f0f0', flex: 1 }}>{toast.msg}</span>
      <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#6b6b6b', cursor: 'pointer', padding: 0, fontSize: 16 }}>✕</button>
    </div>
  );
}
