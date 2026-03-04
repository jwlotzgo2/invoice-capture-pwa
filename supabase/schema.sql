-- Invoice Capture PWA Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Invoice data fields
  supplier TEXT,
  description TEXT,
  invoice_date DATE,
  amount DECIMAL(12, 2),
  vat_amount DECIMAL(12, 2),
  products_services TEXT,
  business_name TEXT,
  
  -- Image storage
  image_url TEXT,
  image_path TEXT,
  
  -- OCR metadata
  raw_ocr_data JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier);

-- Enable Row Level Security (RLS)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own invoices
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own invoices
CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own invoices
CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own invoices
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket setup (run these separately in Supabase dashboard or via API)
-- This creates the storage bucket for invoice images
-- Note: Run this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: invoices
-- Public: true (for easy image access) or false (for signed URLs)

-- Storage RLS policies (if bucket is private)
-- These need to be set up in Supabase Dashboard > Storage > Policies
-- Policy 1: Allow authenticated users to upload to their folder
-- Policy 2: Allow authenticated users to read from their folder
-- Policy 3: Allow authenticated users to delete from their folder
