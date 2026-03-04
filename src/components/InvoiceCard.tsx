'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, Calendar, Building2 } from 'lucide-react';
import { Invoice } from '@/types/invoice';

interface InvoiceCardProps {
  invoice: Invoice;
}

const statusStyles: Record<string, string> = {
  pending:  'background:#fef9c3;color:#854d0e',
  reviewed: 'background:#eff6ff;color:#1d4ed8',
  approved: 'background:#f0fdf4;color:#15803d',
  rejected: 'background:#fff1f2;color:#be123c',
};

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  return (
    <Link href={`/invoices/${invoice.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        padding: '14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s',
        cursor: 'pointer',
      }}>
        {/* Thumbnail */}
        <div style={{
          width: 56, height: 56, borderRadius: 10, flexShrink: 0,
          overflow: 'hidden', background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {invoice.image_url ? (
            <img src={invoice.image_url} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <FileText size={22} color="#94a3b8" />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {invoice.supplier || 'Unknown Supplier'}
            </span>
            <span style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0,
              ...(invoice.status ? Object.fromEntries(
                statusStyles[invoice.status]?.split(';').map(s => {
                  const [k, v] = s.split(':');
                  return [k.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase()), v?.trim()];
                }) ?? []
              ) : {}),
            }}>
              {invoice.status}
            </span>
          </div>

          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {invoice.business_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
                <Building2 size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invoice.business_name}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {invoice.invoice_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                  <Calendar size={13} />
                  <span>{format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</span>
                </div>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>
                {formatCurrency(invoice.amount)}
              </span>
            </div>
          </div>

          {invoice.description && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {invoice.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
