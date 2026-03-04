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

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  color: '#0f172a',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const textarea: React.CSSProperties = {
  ...input,
  resize: 'vertical' as const,
  minHeight: 80,
};

export default function InvoiceForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Invoice',
  imagePreview,
}: InvoiceFormProps) {
  const handleChange = (field: keyof InvoiceFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Image Preview */}
      {imagePreview && (
        <div>
          <span style={label}>Invoice Image</span>
          <img
            src={imagePreview}
            alt="Invoice preview"
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, border: '1.5px solid #e2e8f0' }}
          />
        </div>
      )}

      {/* Business Name */}
      <div>
        <label style={label}>Business Name</label>
        <input
          type="text"
          value={formData.business_name}
          onChange={(e) => handleChange('business_name', e.target.value)}
          placeholder="Your business name"
          style={input}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Supplier */}
      <div>
        <label style={label}>Supplier</label>
        <input
          type="text"
          value={formData.supplier}
          onChange={(e) => handleChange('supplier', e.target.value)}
          placeholder="Supplier name"
          style={input}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={label}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Invoice description"
          style={textarea}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Invoice Date */}
      <div>
        <label style={label}>Invoice Date</label>
        <input
          type="date"
          value={formData.invoice_date}
          onChange={(e) => handleChange('invoice_date', e.target.value)}
          style={input}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Amount + VAT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={label}>Amount (incl. VAT)</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={input}
            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        <div>
          <label style={label}>VAT Amount</label>
          <input
            type="number"
            value={formData.vat_amount}
            onChange={(e) => handleChange('vat_amount', e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={input}
            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Products / Services */}
      <div>
        <label style={label}>Products / Services</label>
        <textarea
          value={formData.products_services}
          onChange={(e) => handleChange('products_services', e.target.value)}
          placeholder="List of products or services"
          style={textarea}
          onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 16px',
              border: '1.5px solid #e2e8f0', borderRadius: 12,
              background: '#fff', color: '#334155',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            flex: 1, padding: '12px 16px',
            border: 'none', borderRadius: 12,
            background: isLoading ? '#93c5fd' : '#2563eb',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isLoading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
