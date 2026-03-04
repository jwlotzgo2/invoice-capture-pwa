-- Phase 3: Invoice Capture PWA - Admin & OCR Tracking Schema
-- Run this in your Supabase SQL Editor after Phase 1 schema

-- ===========================================
-- 1. USER PROFILES TABLE (for admin roles)
-- ===========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow insert for new users (triggered by auth)
CREATE POLICY "Allow insert for authenticated users" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================================
-- 2. OCR ACCURACY TRACKING TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS ocr_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT,
  edited_value TEXT,
  edit_type TEXT DEFAULT 'correction' CHECK (edit_type IN ('correction', 'addition', 'deletion')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ocr_edits_invoice_id ON ocr_edits(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ocr_edits_user_id ON ocr_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_edits_field_name ON ocr_edits(field_name);
CREATE INDEX IF NOT EXISTS idx_ocr_edits_created_at ON ocr_edits(created_at DESC);

-- Enable RLS
ALTER TABLE ocr_edits ENABLE ROW LEVEL SECURITY;

-- Users can insert edits for their own invoices
CREATE POLICY "Users can insert own edits" ON ocr_edits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own edits
CREATE POLICY "Users can view own edits" ON ocr_edits
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all edits
CREATE POLICY "Admins can view all edits" ON ocr_edits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- 3. EMAIL INVOICES TRACKING TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS email_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT UNIQUE,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  attachment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_invoices_user_id ON email_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_email_invoices_status ON email_invoices(status);
CREATE INDEX IF NOT EXISTS idx_email_invoices_received_at ON email_invoices(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_invoices_message_id ON email_invoices(message_id);

-- Enable RLS
ALTER TABLE email_invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own email invoices
CREATE POLICY "Users can view own email invoices" ON email_invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all email invoices
CREATE POLICY "Admins can view all email invoices" ON email_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert (for webhook)
CREATE POLICY "Service can insert email invoices" ON email_invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update email invoices" ON email_invoices
  FOR UPDATE USING (true);

-- ===========================================
-- 4. USER ACTIVITY LOG TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity" ON user_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ===========================================
-- 5. UPDATE INVOICES TABLE FOR ADMIN ACCESS
-- ===========================================

-- Add admin policy for viewing all invoices
CREATE POLICY "Admins can view all invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add source tracking column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'camera' CHECK (source IN ('camera', 'upload', 'email'));

-- Add original OCR values for accuracy tracking
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS original_ocr_values JSONB;

-- ===========================================
-- 6. TRIGGER FOR USER PROFILE CREATION
-- ===========================================

-- Create function to auto-create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- 7. UPDATE USER PROFILE TIMESTAMP TRIGGER
-- ===========================================

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 8. OCR ACCURACY ANALYTICS VIEW
-- ===========================================

CREATE OR REPLACE VIEW ocr_accuracy_stats AS
SELECT 
  field_name,
  COUNT(*) as total_edits,
  COUNT(DISTINCT invoice_id) as invoices_affected,
  DATE_TRUNC('day', created_at) as edit_date
FROM ocr_edits
GROUP BY field_name, DATE_TRUNC('day', created_at);

-- ===========================================
-- 9. ADMIN DASHBOARD VIEW
-- ===========================================

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM user_profiles WHERE is_active = true) as total_users,
  (SELECT COUNT(*) FROM invoices) as total_invoices,
  (SELECT COUNT(*) FROM invoices WHERE created_at > NOW() - INTERVAL '7 days') as invoices_this_week,
  (SELECT COUNT(*) FROM email_invoices) as total_email_invoices,
  (SELECT COUNT(*) FROM ocr_edits) as total_ocr_edits;

-- Grant access to views for authenticated users
GRANT SELECT ON ocr_accuracy_stats TO authenticated;
GRANT SELECT ON admin_dashboard_stats TO authenticated;

-- ===========================================
-- 10. INSERT EXISTING USERS TO PROFILES (if any)
-- ===========================================

INSERT INTO user_profiles (id, email, full_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;
