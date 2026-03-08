import { createClient } from '@/lib/supabase/client';
import { getPendingInvoices, removePendingInvoice, updatePendingInvoice } from './offlineQueue';

export async function syncPendingInvoices(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingInvoices();
  if (!pending.length) return { synced: 0, failed: 0 };

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { synced: 0, failed: 0 };
  const user = session.user;

  let synced = 0, failed = 0;

  for (const invoice of pending) {
    try {
      await updatePendingInvoice(invoice.id, { status: 'syncing' });

      let imageUrl = null;
      let imagePath = null;

      // Upload image if present
      if (invoice.image) {
        const isPdf = invoice.image.startsWith('data:application/pdf');
        const ext = isPdf ? 'pdf' : 'jpg';
        const contentType = isPdf ? 'application/pdf' : 'image/jpeg';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const base64Data = invoice.image.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices').upload(fileName, binaryData, { contentType, upsert: false });
        if (uploadError) throw uploadError;
        imagePath = uploadData.path;
        const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(imagePath);
        imageUrl = urlData.publicUrl;
      }

      // Run OCR if needed
      let ocrData: Record<string, any> = {};
      if (invoice.formData?.needs_ocr && invoice.image && !invoice.image.startsWith('data:application/pdf')) {
        try {
          const ocrRes = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: invoice.image }),
          });
          if (ocrRes.ok) {
            const result = await ocrRes.json();
            ocrData = {
              supplier: result.supplier || null,
              description: result.description || null,
              invoice_date: result.invoice_date || null,
              amount: result.amount ? parseFloat(result.amount) : null,
              vat_amount: result.vat_amount ? parseFloat(result.vat_amount) : null,
              products_services: result.products_services || null,
              business_name: result.business_name || null,
              document_type: result.document_type || 'invoice',
              category: result.category || null,
              document_number: result.document_number || null,
              line_items: result.line_items?.length ? result.line_items : null,
              original_ocr_values: result,
            };
          }
        } catch (ocrErr) {
          console.error('OCR failed during sync:', ocrErr);
        }
      }

      const { needs_ocr, ...restFormData } = invoice.formData || {};

      const { error: insertError } = await supabase.from('invoices').insert({
        user_id: user.id,
        ...restFormData,
        ...ocrData,
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
