'use client';

// Drop this in layout.tsx — listens for reconnect and SW sync messages
// then replays any queued offline invoices

import { useEffect } from 'react';
import { syncPendingInvoices } from '@/lib/syncInvoices';

export default function SyncManager() {
  useEffect(() => {
    // Sync on reconnect
    const handleOnline = async () => {
      const { synced } = await syncPendingInvoices();
      if (synced > 0) console.log(`Synced ${synced} offline invoice(s)`);
    };

    // Sync on SW background sync message
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_INVOICES') {
        await syncPendingInvoices();
      }
    };

    window.addEventListener('online', handleOnline);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Also sync on mount in case we have pending items from a previous session
    if (navigator.onLine) syncPendingInvoices();

    return () => {
      window.removeEventListener('online', handleOnline);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
