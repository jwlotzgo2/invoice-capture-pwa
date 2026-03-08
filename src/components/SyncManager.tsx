'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { syncPendingInvoices } from '@/lib/syncInvoices';
import { Wifi, WifiOff } from 'lucide-react';

export default function SyncManager() {
  const [toast, setToast] = useState<{ msg: string; type: 'online' | 'offline' } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const showToast = (msg: string, type: 'online' | 'offline') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleOffline = () => {
      // Only redirect if not already on offline page
      if (pathname !== '/offline') {
        router.push('/offline');
      }
    };

    const handleOnline = () => {
      // Redirect immediately — don't wait for sync
      if (window.location.pathname === '/offline') {
        router.push('/');
      }
      // Sync in background
      syncPendingInvoices().then(({ synced }) => {
        if (synced > 0) showToast(`${synced} document${synced > 1 ? 's' : ''} uploaded and processed`, 'online');
      });
    };

    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_INVOICES') {
        const { synced } = await syncPendingInvoices();
        if (synced > 0) showToast(`${synced} document${synced > 1 ? 's' : ''} synced`, 'online');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Sync any pending on mount if online
    if (navigator.onLine) syncPendingInvoices();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [pathname]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 9999,
      background: '#282828',
      border: `1px solid ${toast.type === 'online' ? '#86efac' : '#fdba74'}`,
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.2s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform:translateY(20px);opacity:0 } to { transform:translateY(0);opacity:1 } }`}</style>
      {toast.type === 'online'
        ? <Wifi size={16} color="#86efac" />
        : <WifiOff size={16} color="#fdba74" />}
      <span style={{ fontSize: 13, color: '#f0f0f0', flex: 1 }}>{toast.msg}</span>
      <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#6b6b6b', cursor: 'pointer', padding: 0, fontSize: 16 }}>✕</button>
    </div>
  );
}
