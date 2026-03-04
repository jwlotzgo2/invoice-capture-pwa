'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceFormData, LineItem, InvoiceCategory } from '@/types/invoice';
import InvoiceForm from '@/components/InvoiceForm';
import { ArrowLeft, Trash2, Edit2, Loader2, AlertCircle, ScanLine, CheckCircle } from 'lucide-react';

const CATEGORIES: InvoiceCategory[] = [
  'Travel & Transport', 'Utilities', 'Materials & Supplies', 'Subscriptions & Software',
  'Professional Services', 'Food & Entertainment', 'Equipment', 'Marketing', 'Other',
];

const fmtZAR = (n: number | null | undefined) =>
  n != null ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n).replace('ZAR', 'R') : null;

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanDone, setRescanDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<InvoiceCategory | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
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
        setCategory(data.category || null);
        setLineItems(Array.isArray(data.line_items) ? data.line_items : []);
        setFormData({
          supplier: data.supplier || '', description: data.description || '',
          invoice_date: data.invoice_date || '', amount: data.amount?.toString() || '',
          vat_amount: data.vat_amount?.toString() || '',
          products_services: data.products_services || '', business_name: data.business_name || '',
        });
      } catch {
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  // ── Re-scan ────────────────────────────────────────────────────────────────
  const handleRescan = async () => {
    if (!invoice?.image_url) { setError('No image available to re-scan'); return; }
    setRescanning(true); setRescanDone(false); setError(null);
    try {
      const imgRes = await fetch(invoice.image_url);
      const blob = await imgRes.blob();
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });

      const ocrRes = await fetch('/api/ocr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (!ocrRes.ok) throw new Error('OCR failed');
      const result = await ocrRes.json();

      const updates = {
        supplier: result.supplier ?? invoice.supplier,
        description: result.description ?? invoice.description,
        invoice_date: result.invoice_date ?? invoice.invoice_date,
        amount: result.amount ?? invoice.amount,
        vat_amount: result.vat_amount ?? invoice.vat_amount,
        products_services: result.products_services ?? invoice.products_services,
        business_name: result.business_name ?? invoice.business_name,
        category: result.category || null,
        line_items: result.line_items?.length > 0 ? result.line_items : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from('invoices').update(updates).eq('id', id);
      if (updateError) throw updateError;

      const updated = { ...invoice, ...updates } as Invoice;
      setInvoice(updated);
      setCategory(result.category || null);
      setLineItems(result.line_items || []);
      setFormData({
        supplier: updates.supplier || '', description: updates.description || '',
        invoice_date: updates.invoice_date || '', amount: updates.amount?.toString() || '',
        vat_amount: updates.vat_amount?.toString() || '',
        products_services: updates.products_services || '', business_name: updates.business_name || '',
      });
      setRescanDone(true);
      setTimeout(() => setRescanDone(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-scan failed');
    } finally {
      setRescanning(false);
    }
  };

  // ── Save edits ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const originalValues = invoice?.original_ocr_values as Record<string, unknown> | null;
      const ocrEdits: { field_name: string; original_value: string | null; edited_value: string | null; edit_type: 'correction' | 'addition' | 'deletion' }[] = [];

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
        category: category || null,
        line_items: lineItems.length > 0 ? lineItems : null,
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
      setCategory(invoice.category || null);
      setLineItems(Array.isArray(invoice.line_items) ? invoice.line_items : []);
    }
  };

  const statusStyle = (s: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6,
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
    background: s === 'approved' ? '#f0fdf4' : s === 'rejected' ? '#fff1f2' : s === 'reviewed' ? '#eff6ff' : '#fef9c3',
    color: s === 'approved' ? '#15803d' : s === 'rejected' ? '#be123c' : s === 'reviewed' ? '#1d4ed8' : '#854d0e',
  });

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!invoice) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <AlertCircle size={48} color="#e11d48" />
      <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>Invoice not found</p>
      <button onClick={() => router.push('/invoices')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Back to invoices</button>
    </div>
  );

  const confidence = (invoice.raw_ocr_data as any)?.confidence as number | undefined;

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/invoices')} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{invoice.supplier || 'Invoice Details'}</div>
            <span style={statusStyle(invoice.status)}>{invoice.status}</span>
          </div>
        </div>

        {!editing && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {invoice.image_url && (
              <button onClick={handleRescan} disabled={rescanning} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: rescanDone ? '#f0fdf4' : '#fff', color: rescanDone ? '#15803d' : '#334155', fontSize: 13, fontWeight: 600, cursor: rescanning ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {rescanning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : rescanDone ? <CheckCircle size={14} /> : <ScanLine size={14} />}
                {rescanning ? 'Scanning…' : rescanDone ? 'Updated' : 'Re-scan'}
              </button>
            )}
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Edit2 size={15} /> Edit
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', cursor: 'pointer' }}>
              {deleting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={18} />}
            </button>
          </div>
        )}
      </header>

      <main style={{ padding: 16, paddingBottom: 60 }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, marginBottom: 16, color: '#be123c', fontSize: 14 }}>
            <AlertCircle size={18} />{error}
          </div>
        )}

        {/* Invoice image */}
        {invoice.image_url && (
          <img src={invoice.image_url} alt="Invoice" style={{ width: '100%', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 12 }} />
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {confidence != null && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: confidence >= 0.85 ? '#f0fdf4' : confidence >= 0.65 ? '#fffbeb' : '#fff1f2', color: confidence >= 0.85 ? '#15803d' : confidence >= 0.65 ? '#854d0e' : '#be123c' }}>
              OCR {Math.round(confidence * 100)}%
            </span>
          )}
          {invoice.is_paid && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#f0fdf4', color: '#15803d' }}>
              {invoice.payment_method ? invoice.payment_method.toUpperCase() : 'PAID'}
            </span>
          )}
          {category && !editing && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>
              {category}
            </span>
          )}
        </div>

        {editing ? (
          <>
            {/* Category picker */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Category</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderColor: category === cat ? '#2563eb' : '#e2e8f0', background: category === cat ? '#eff6ff' : '#fff', color: category === cat ? '#2563eb' : '#64748b' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit form */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16 }}>
              <InvoiceForm formData={formData} onChange={setFormData} onSubmit={handleSave} onCancel={cancelEdit} isLoading={saving} submitLabel="Save Changes" />
            </div>
          </>
        ) : (
          <>
            {/* Invoice fields */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
              <DetailRow label="Business Name" value={invoice.business_name} />
              <DetailRow label="Supplier" value={invoice.supplier} />
              <DetailRow label="Description" value={invoice.description} />
              <DetailRow label="Invoice Date" value={invoice.invoice_date} />
              <DetailRow label="Amount" value={fmtZAR(invoice.amount)} />
              <DetailRow label="VAT Amount" value={fmtZAR(invoice.vat_amount)} />
              <DetailRow label="Products / Services" value={invoice.products_services} last />
            </div>

            {/* Line items */}
            {lineItems.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 16 }}>
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
                        <tr key={i} style={{ borderBottom: i < lineItems.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                          <td style={{ padding: '8px', color: '#0f172a' }}>{item.description}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{item.quantity ?? '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>{item.unit_price != null ? `R ${item.unit_price.toFixed(2)}` : '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{item.line_total != null ? `R ${item.line_total.toFixed(2)}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 14, borderBottom: last ? 'none' : '1px solid #f1f5f9', marginBottom: last ? 0 : 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: value ? '#0f172a' : '#94a3b8' }}>{value || '—'}</div>
    </div>
  );
}
