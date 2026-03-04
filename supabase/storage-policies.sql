-- Supabase Storage Policies for Invoice Images
-- Run these in Supabase SQL Editor after creating the 'invoices' bucket

-- Allow users to upload images to their own folder
CREATE POLICY "Users can upload invoice images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own invoice images
CREATE POLICY "Users can view own invoice images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to invoice images (optional - for public bucket)
CREATE POLICY "Public can view invoice images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invoices');

-- Allow users to delete their own invoice images
CREATE POLICY "Users can delete own invoice images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own invoice images
CREATE POLICY "Users can update own invoice images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
