-- Product Images Bucket Setup Script
-- This script creates and configures the storage bucket for product images
-- Run this script in the Supabase SQL Editor to fix image upload issues

-- Step 1: Create the product_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO UPDATE 
  SET public = true; -- Make sure it's public even if it already exists
  
-- Step 2: Enable Row Level Security on the objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies for product_images bucket to avoid conflicts
-- Rather than trying to delete from pg_policy directly (which can cause errors), 
-- drop the specific policies we know might exist
DO $$
BEGIN
    -- Drop existing policies one by one
    DROP POLICY IF EXISTS "Allow public read access to product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated users to upload to product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow users to manage their product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow admins to manage all product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow anyone to upload to product_images" ON storage.objects;
    
    -- Drop policies with alternative names that might exist
    DROP POLICY IF EXISTS "Public can view product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload to product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete product_images" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can manage product_images" ON storage.objects;
END
$$;

-- Step 4: Create new, comprehensive policies for the product_images bucket

-- Public read access policy (allows anyone to view images)
CREATE POLICY "Allow public read access to product_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product_images');

-- UPDATED: Allow ANYONE (including anonymous) to upload to product_images
CREATE POLICY "Allow anyone to upload to product_images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'product_images'
);

-- Public update/delete policy (allows anyone to manage files)
CREATE POLICY "Allow anyone to manage product_images"
ON storage.objects FOR ALL
TO public
USING (
    bucket_id = 'product_images'
)
WITH CHECK (
    bucket_id = 'product_images'
);

-- Step 5: Create helper function to verify bucket setup
CREATE OR REPLACE FUNCTION check_product_images_bucket()
RETURNS TEXT AS $$
DECLARE
    bucket_exists BOOLEAN;
    public_setting BOOLEAN;
    policy_count INT;
    result TEXT;
BEGIN
    -- Check if bucket exists
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'product_images'
    ) INTO bucket_exists;
    
    -- Check if bucket is public
    SELECT public FROM storage.buckets 
    WHERE id = 'product_images' 
    INTO public_setting;
    
    -- Count policies for product_images
    SELECT COUNT(*) FROM pg_policy 
    WHERE polname LIKE '%product_images%'
    INTO policy_count;
    
    -- Build result message
    IF bucket_exists THEN
        result := 'SUCCESS: product_images bucket exists';
        IF public_setting THEN
            result := result || ' and is set to public.';
        ELSE
            result := result || ' but is NOT public.';
        END IF;
        
        result := result || ' Found ' || policy_count || ' policies.';
    ELSE
        result := 'ERROR: product_images bucket does not exist!';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Execute the check and return the result
SELECT check_product_images_bucket() AS setup_status; 