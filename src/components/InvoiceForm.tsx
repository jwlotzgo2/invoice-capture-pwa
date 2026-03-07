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
}

const T = {
  bg: '#0d0d0d', surface: '#1a1a1a', border: '#2a2a2a',
  yellow: '#facc15', yellowGlow: 'rgba(250,204,21,0.15)',
  blue: '#6366f1', blueGlow: 'rgba(99,102,241,0.2)',
  text: '#e2e8f0', textMuted: '#475569', error: '#f87171',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4,
  color: T.text, fontFamily: "'Share Tech Mono', 'Courier New', monospace",
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 10, letterSpacing: '2px',
  color: T.text, textTransform: 'uppercase', marginBottom: 5,
  fontFamily: "'Share Tech Mono', 'Courier New', monospace",
};

export default function InvoiceForm({
  formData, onChange, onSubmit, onCancel, isLoading = false,
  submitLabel = 'Save Invoice', imagePreview,
}: InvoiceFormProps) {
  const handleChange = (field: keyof InvoiceFormData, value: string) =>
    onChange({ ...formData, [field]: value });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(); };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = T.blue;
    e.target.style.boxShadow = `0 0 0 2px ${T.blueGlow}`;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = T.border;
    e.target.style.boxShadow = 'none';
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {imagePreview && (
        <div>
          <span style={lbl}>Invoice Image</span>
          <img src={imagePreview} alt="Invoice preview" style={{
            width: '100%', maxHeight: 200, objectFit: 'contain',
            borderRadius: 4, border: `1px solid ${T.border}`,
          }} />
        </div>
      )}

      {[
        { label: 'Business Name', key: 'business_name', type: 'text', placeholder: 'Your business name' },
        { label: 'Supplier', key: 'supplier', type: 'text', placeholder: 'Supplier name' },
        { label: 'Invoice Date', key: 'invoice_date', type: 'date', placeholder: '' },
      ].map(({ label, key, type, placeholder }) => (
        <div key={key}>
          <label style={lbl}>{label}</label>
          <input
            type={type} value={formData[key as keyof InvoiceFormData]}
            onChange={e => handleChange(key as keyof InvoiceFormData, e.target.value)}
            placeholder={placeholder} style={inp}
            onFocus={focusStyle} onBlur={blurStyle}
          />
        </div>
      ))}

      <div>
        <label style={lbl}>Description</label>
        <textarea
          value={formData.description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Invoice description"
          style={{ ...inp, resize: 'vertical', minHeight: 70 } as React.CSSProperties}
          onFocus={focusStyle} onBlur={blurStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Amount (incl. VAT)', key: 'amount' },
          { label: 'VAT Amount', key: 'vat_amount' },
        ].map(({ label, key }) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <input
              type="number" value={formData[key as keyof InvoiceFormData]}
              onChange={e => handleChange(key as keyof InvoiceFormData, e.target.value)}
              placeholder="0"
              style={{ ...inp, color: T.yellow, textAlign: 'right' }}
              onFocus={e => { e.target.style.borderColor = T.yellow; e.target.style.boxShadow = `0 0 0 2px ${T.yellowGlow}`; }}
              onBlur={blurStyle}
            />
          </div>
        ))}
      </div>

      <div>
        <label style={lbl}>Products / Services</label>
        <textarea
          value={formData.products_services}
          onChange={e => handleChange('products_services', e.target.value)}
          placeholder="List of products or services"
          style={{ ...inp, resize: 'vertical', minHeight: 70 } as React.CSSProperties}
          onFocus={focusStyle} onBlur={blurStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '11px 16px',
            border: `1px solid ${T.border}`, borderRadius: 6,
            background: 'transparent', color: '#94a3b8',
            fontSize: 13, letterSpacing: '1px', cursor: 'pointer',
            fontFamily: "'Share Tech Mono', monospace", textTransform: 'uppercase',
          }}>Cancel</button>
        )}
        <button type="submit" disabled={isLoading} style={{
          flex: 1, padding: '14px 16px', border: 'none', borderRadius: 6,
          background: isLoading ? '#a37e0a' : T.yellow,
          color: '#0d0d0d',
          fontFamily: "'VT323', monospace",
          fontSize: 20, letterSpacing: '3px', cursor: isLoading ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          boxShadow: isLoading ? 'none' : '0 0 20px rgba(250,204,21,0.3)',
        }}>
          {isLoading ? 'SAVING…' : submitLabel.toUpperCase()}
        </button>
      </div>
    </form>
  );
}
