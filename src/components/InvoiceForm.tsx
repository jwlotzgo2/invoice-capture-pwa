'use client';

import React from 'react';
import { InvoiceFormData } from '@/types/invoice';

interface InvoiceFormProps {
  formData: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  imagePreview?: string | null;
  pdfPreview?: string | null;
}

const T = {
  bg: '#1c1c1c', surface: '#282828', border: '#383838',
  text: '#f0f0f0', textMuted: '#6b6b6b', primary: '#e5e5e5',
  blue: '#8a8a8a', error: '#fca5a5',
};

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, color: T.textMuted, marginBottom: 5,
};

const fieldInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: `1px solid ${T.border}`, borderRadius: 6,
  fontSize: 14, color: T.text, background: T.bg,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

const fieldTextarea: React.CSSProperties = {
  ...fieldInput, resize: 'vertical' as const, minHeight: 72,
};

export default function InvoiceForm({
  formData, onChange, onSubmit, onCancel,
  isLoading = false, submitLabel = 'Save Invoice', imagePreview, pdfPreview,
}: InvoiceFormProps) {
  const handleChange = (field: keyof InvoiceFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = T.primary;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = T.border;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {imagePreview && (
        <div>
          <span style={fieldLabel}>Invoice Image</span>
          <img src={imagePreview} alt="Invoice preview"
            style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 6, border: `1px solid ${T.border}` }} />
        </div>
      )}

      {pdfPreview && (
        <div>
          <span style={fieldLabel}>PDF Document</span>
          <iframe src={pdfPreview} style={{ width: '100%', height: 200, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg }} />
        </div>
      )}

      <div>
        <label style={fieldLabel}>Business Name</label>
        <input type="text" value={formData.business_name} onChange={e => handleChange('business_name', e.target.value)}
          placeholder="Your business name" style={fieldInput} onFocus={focusStyle} onBlur={blurStyle} />
      </div>

      <div>
        <label style={fieldLabel}>Supplier</label>
        <input type="text" value={formData.supplier} onChange={e => handleChange('supplier', e.target.value)}
          placeholder="Supplier name" style={fieldInput} onFocus={focusStyle} onBlur={blurStyle} />
      </div>

      <div>
        <label style={fieldLabel}>Description</label>
        <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)}
          placeholder="Invoice description" style={fieldTextarea}
          onFocus={focusStyle as any} onBlur={blurStyle as any} />
      </div>

      <div>
        <label style={fieldLabel}>Invoice Date</label>
        <input type="date" value={formData.invoice_date} onChange={e => handleChange('invoice_date', e.target.value)}
          style={{ ...fieldInput, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={fieldLabel}>Amount (incl. VAT)</label>
          <input type="number" value={formData.amount} onChange={e => handleChange('amount', e.target.value)}
            placeholder="0.00" step="0.01" min="0" style={fieldInput} onFocus={focusStyle} onBlur={blurStyle} />
        </div>
        <div>
          <label style={fieldLabel}>VAT Amount</label>
          <input type="number" value={formData.vat_amount} onChange={e => handleChange('vat_amount', e.target.value)}
            placeholder="0.00" step="0.01" min="0" style={fieldInput} onFocus={focusStyle} onBlur={blurStyle} />
        </div>
      </div>

      <div>
        <label style={fieldLabel}>Products / Services</label>
        <textarea value={formData.products_services} onChange={e => handleChange('products_services', e.target.value)}
          placeholder="List of products or services" style={fieldTextarea}
          onFocus={focusStyle as any} onBlur={blurStyle as any} />
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '11px 16px', border: `1px solid ${T.border}`,
            borderRadius: 8, background: 'transparent', color: T.text,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
        )}
        <button type="button" onClick={onSubmit} disabled={isLoading} style={{
          flex: 1, padding: '11px 16px', border: 'none', borderRadius: 8,
          background: isLoading ? T.border : T.primary,
          color: '#1c1c1c', fontSize: 14, fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {isLoading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
