'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Invoice, DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/invoice';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#fef9c3', color: '#854d0e' },
  reviewed: { bg: '#eff6ff', color: '#1d4ed8' },
  approved: { bg: '#f0fdf4', color: '#15803d' },
  rejected: { bg: '#fff1f2', color: '#be123c' },
};

export default function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const fmtZAR = (n: number | null) => n != null
    ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n).replace('ZAR', 'R')
    : '—';

  const s = STATUS_STYLE[invoice.status] || STATUS_STYLE.pending;
  const docType = (invoice.document_type || 'invoice') as DocumentType;
  const dateStr = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Link href={`/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', gap: 12, fontFamily: 'DM Sans, sans-serif',
      }}>
        {/* Thumbnail */}
        <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden' }}>
          {invoice.image_url
            ? <img src={invoice.image_url} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={22} color="#94a3b8" /></div>
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {invoice.supplier || 'Unknown Supplier'}
              </div>
              {invoice.business_name && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.business_name}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>{fmtZAR(invoice.amount)}</div>
              {dateStr && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{dateStr}</div>}
            </div>
          </div>

          {invoice.description && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invoice.description}</div>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {DOCUMENT_TYPE_LABELS[docType]}
            </span>
            <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: s.bg, color: s.color }}>
              {invoice.status}
            </span>
            {invoice.category && (
              <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>{invoice.category}</span>
            )}
            {invoice.is_paid && (
              <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#15803d' }}>
                {invoice.payment_method?.toUpperCase() || 'PAID'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
