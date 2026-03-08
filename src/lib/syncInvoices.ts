// Client-side sync runner — called on reconnect or SW background sync
// src/lib/syncInvoices.ts

import { createClient } from '@/lib/supabase/client';
import { getPendingInvoices, removePendingInvoice, updatePendingInvoice } from './offlineQueue';

export async function syncPendingInvoices(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingInvoices();
  if (!pending.length) return { synced: 0, failed: 0 };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;

  for (const invoice of pending) {
    try {
      await updatePendingInvoice(invoice.id, { status: 'syncing' });

      let imageUrl = null;
      let imagePath = null;

      // Upload image if present
      if (invoice.image) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = invoice.image.split(',')[1];
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
        ...invoice.formData,
        image_url: imageUrl,
        image_path: imagePath,
        source: 'camera',
        status: 'pending',
      });

      if (insertError) throw insertError;

      await removePendingInvoice(invoice.id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync invoice ${invoice.id}:`, err);
      await updatePendingInvoice(invoice.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      failed++;
    }
  }

  return { synced, failed };
}
