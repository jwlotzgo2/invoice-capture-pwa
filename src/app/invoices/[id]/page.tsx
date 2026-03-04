'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFormData } from '@/types/invoice';
import InvoiceForm from '@/components/InvoiceForm';
import { ArrowLeft, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    supplier: '', description: '', invoice_date: '',
    amount: '', vat_amount: '', products_services: '', business_name: '',
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
        if (error) throw error;
        setInvoice(data);
        setFormData({
          supplier: data.supplier || '', description: data.description || '',
          invoice_date: data.invoice_date || '', amount: data.amount?.toString() || '',
          vat_amount: data.vat_amount?.toString() || '',
          products_services: data.products_services || '', business_name: data.business_name || '',
        });
      } catch (err) {
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const originalValues = invoice?.original_ocr_values as Record<string, unknown> | null;
      const ocrEdits: { field_name: string; original_value: string | null; edited_value: string | null; edit_type: 'correction' | 'addition' | 'deletion'; }[] = [];

      if (originalValues) {
        for (const key of ['supplier','description','invoice_date','amount','vat_amount','products_services','business_name']) {
          const originalVal = originalValues[key]?.toString() || null;
          const editedVal = formData[key as keyof typeof formData] || null;
          if (originalVal !== editedVal) {
            const editType = !originalVal && editedVal ? 'addition' : originalVal && !editedVal ? 'deletion' : 'correction';
            ocrEdits.push({ field_name: key, original_value: originalVal, edited_value: editedVal, edit_type: editType });
          }
        }
      }

      const { error: updateError } = await supabase.from('invoices').update({
        supplier: formData.supplier || null, description: formData.description || null,
        invoice_date: formData.invoice_date || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        products_services: formData.products_services || null,
        business_name: formData.business_name || null,
        status: 'reviewed', updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (updateError) throw updateError;

      if (ocrEdits.length > 0) {
        await fetch('/api/ocr-edits', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: id, edits: ocrEdits }),
        });
      }
      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return;
    setDeleting(true);
    try {
      if (invoice?.image_path) await supabase.storage.from('invoices').remove([invoice.image_path]);
      const { error: deleteError } = await supabase.from('invoices').delete().eq('id', id);
      if (deleteError) throw deleteError;
      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      setDeleting(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    if (invoice) {
      setFormData({
        supplier: invoice.supplier || '', description: invoice.description || '',
        invoice_date: invoice.invoice_date || '', amount: invoice.amount?.toString() || '',
        vat_amount: invoice.vat_amount?.toString() || '',
        products_services: invoice.products_services || '', business_name: invoice.business_name || '',
      });
    }
  };

  const statusBadge = (status: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
    background: status === 'approved' ? '#f0fdf4' : status === 'rejected' ? '#fff1f2' : status === 'reviewed' ? '#eff6ff' : '#fef9c3',
    color: status === 'approved' ? '#15803d' : status === 'rejected' ? '#be123c' : status === 'reviewed' ? '#1d4ed8' : '#854d0e',
  });

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!invoice) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AlertCircle size={48} color="#e11d48" />
      <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>Invoice not found</p>
      <button onClick={() => router.push('/invoices')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
        Back to invoices
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, background: '#fff',
        borderBottom: '1px solid #e2e8f0', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/invoices')} style={{
            width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer',
          }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {invoice.supplier || 'Invoice Details'}
            </div>
            <span style={statusBadge(invoice.status)}>{invoice.status}</span>
          </div>
        </div>

        {/* View mode: Edit + Delete. Edit mode: nothing (form has its own buttons) */}
        {!editing && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditing(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Edit2 size={15} /> Edit
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', cursor: 'pointer',
            }}>
              {deleting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={18} />}
            </button>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main style={{ padding: 16, paddingBottom: 40 }}>
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: 12,
            background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10,
            marginBottom: 16, color: '#be123c', fontSize: 14,
          }}>
            <AlertCircle size={18} />{error}
          </div>
        )}

        {invoice.image_url && (
          <img src={invoice.image_url} alt="Invoice" style={{
            width: '100%', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 16,
          }} />
        )}

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16 }}>
          {editing ? (
            /* Edit mode — InvoiceForm has its own Save / Cancel buttons, no duplicates */
            <InvoiceForm
              formData={formData}
              onChange={setFormData}
              onSubmit={handleSave}
              onCancel={cancelEdit}
              isLoading={saving}
              submitLabel="Save Changes"
            />
          ) : (
            /* View mode — read-only */
            <>
              <DetailRow label="Business Name" value={invoice.business_name} />
              <DetailRow label="Supplier" value={invoice.supplier} />
              <DetailRow label="Description" value={invoice.description} />
              <DetailRow label="Invoice Date" value={invoice.invoice_date} />
              <DetailRow label="Amount" value={invoice.amount ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.amount) : null} />
              <DetailRow label="VAT Amount" value={invoice.vat_amount ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(invoice.vat_amount) : null} />
              <DetailRow label="Products / Services" value={invoice.products_services} last />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 14, borderBottom: last ? 'none' : '1px solid #f1f5f9', marginBottom: last ? 0 : 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: value ? '#0f172a' : '#94a3b8' }}>
        {value || '—'}
      </div>
    </div>
  );
}
