-- Create RPC Functions for Storage Management
-- This file contains SQL functions that you can call through the Supabase API

-- Function to execute arbitrary SQL (use with care, requires admin privileges)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text AS $$
BEGIN
  EXECUTE sql;
  RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create universal bucket policies (anyone can do anything)
CREATE OR REPLACE FUNCTION create_universal_bucket_policies(bucket_name text)
RETURNS text AS $$
BEGIN
  -- Drop existing policies for this bucket
  EXECUTE 'DROP POLICY IF EXISTS "Allow public read for ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow public insert for ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow public update for ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow public delete for ' || bucket_name || '" ON storage.objects';
  
  -- Drop old style policies if they exist
  EXECUTE 'DROP POLICY IF EXISTS "Allow public read access to ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to upload to ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow users to manage their ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow admins to manage all ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anyone to upload to ' || bucket_name || '" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow anyone to manage ' || bucket_name || '" ON storage.objects';
  
  -- Create new permissive policies
  -- Read policy (allows anyone to view files)
  EXECUTE 'CREATE POLICY "Allow public read for ' || bucket_name || '" ON storage.objects 
          FOR SELECT TO public USING (bucket_id = ''' || bucket_name || ''')';
          
  -- Upload policy (allows anyone to upload files)
  EXECUTE 'CREATE POLICY "Allow public insert for ' || bucket_name || '" ON storage.objects 
          FOR INSERT TO public WITH CHECK (bucket_id = ''' || bucket_name || ''')';
          
  -- Update policy (allows anyone to update files)
  EXECUTE 'CREATE POLICY "Allow public update for ' || bucket_name || '" ON storage.objects 
          FOR UPDATE TO public USING (bucket_id = ''' || bucket_name || ''') 
          WITH CHECK (bucket_id = ''' || bucket_name || ''')';
          
  -- Delete policy (allows anyone to delete files)
  EXECUTE 'CREATE POLICY "Allow public delete for ' || bucket_name || '" ON storage.objects 
          FOR DELETE TO public USING (bucket_id = ''' || bucket_name || ''')';
          
  RETURN 'Created universal policies for bucket: ' || bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure product_images bucket exists with correct permissions
CREATE OR REPLACE FUNCTION ensure_product_images_bucket()
RETURNS text AS $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = 'product_images'
  ) INTO bucket_exists;
  
  -- Create the bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('product_images', 'product_images', true);
  ELSE
    -- Make sure it's public
    UPDATE storage.buckets SET public = true WHERE id = 'product_images';
  END IF;
  
  -- Set universal permissions
  PERFORM create_universal_bucket_policies('product_images');
  
  RETURN 'Product images bucket created and configured with universal permissions';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 