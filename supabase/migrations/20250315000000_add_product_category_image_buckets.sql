-- Create a bucket for storing product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

-- Create a bucket for storing category images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('category_images', 'category_images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage bucket if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist for product images
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;

-- Drop existing policies if they exist for category images
DROP POLICY IF EXISTS "Admins can upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update category images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete category images" ON storage.objects;
DROP POLICY IF EXISTS "Category images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage category images" ON storage.objects;

-- Create policy for admin users to manage product images using DO block to check if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Admins can manage product images'
  ) THEN
    CREATE POLICY "Admins can manage product images"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = 'product_images' AND
      auth.jwt() ->> 'role' = 'admin'
    )
    WITH CHECK (
      bucket_id = 'product_images' AND
      auth.jwt() ->> 'role' = 'admin'
    );
  END IF;
END $$;

-- Create policy for admin users to manage category images using DO block to check if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Admins can manage category images'
  ) THEN
    CREATE POLICY "Admins can manage category images"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
      bucket_id = 'category_images' AND
      auth.jwt() ->> 'role' = 'admin'
    )
    WITH CHECK (
      bucket_id = 'category_images' AND
      auth.jwt() ->> 'role' = 'admin'
    );
  END IF;
END $$;

-- Allow public access to product images (read-only) using DO block to check if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Product images are publicly accessible'
  ) THEN
    CREATE POLICY "Product images are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'product_images');
  END IF;
END $$;

-- Allow public access to category images (read-only) using DO block to check if it exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'Category images are publicly accessible'
  ) THEN
    CREATE POLICY "Category images are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'category_images');
  END IF;
END $$;

-- Add functions to generate storage URLs for products and categories

-- Function to generate a product image URL from storage
CREATE OR REPLACE FUNCTION get_product_image_url(product_id UUID, image_index INTEGER)
RETURNS TEXT AS $$
DECLARE
  storage_url TEXT := (SELECT value FROM pg_settings WHERE name = 'app.settings.storage_url');
  bucket_name TEXT := 'product_images';
BEGIN
  RETURN storage_url || '/' || bucket_name || '/' || product_id || '/' || image_index;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a category image URL from storage
CREATE OR REPLACE FUNCTION get_category_image_url(category_id UUID)
RETURNS TEXT AS $$
DECLARE
  storage_url TEXT := (SELECT value FROM pg_settings WHERE name = 'app.settings.storage_url');
  bucket_name TEXT := 'category_images';
BEGIN
  RETURN storage_url || '/' || bucket_name || '/' || category_id;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update product and category tables when images are uploaded

-- Function to update product image_urls when a new product image is uploaded
CREATE OR REPLACE FUNCTION update_product_image_urls()
RETURNS TRIGGER AS $$
DECLARE
  product_id UUID;
  image_index INTEGER;
  current_urls TEXT[];
BEGIN
  -- Extract product_id and image_index from the path
  -- Path format: product_id/image_index.extension
  product_id := (regexp_match(NEW.name, '^([^/]+)'))[1]::UUID;
  image_index := (regexp_match(NEW.name, '/(\d+)\.'))[1]::INTEGER;
  
  -- Get current image_urls
  SELECT image_urls INTO current_urls FROM products WHERE id = product_id;
  
  -- If image_index is beyond current array size, extend the array
  WHILE array_length(current_urls, 1) < image_index + 1 LOOP
    current_urls := array_append(current_urls, NULL);
  END LOOP;
  
  -- Update the specific index with the new URL
  current_urls[image_index + 1] := get_product_image_url(product_id, image_index);
  
  -- Update the product
  UPDATE products 
  SET image_urls = current_urls, updated_at = NOW()
  WHERE id = product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product image_urls when a new image is uploaded
DROP TRIGGER IF EXISTS on_product_image_upload ON storage.objects;
CREATE TRIGGER on_product_image_upload
  AFTER INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'product_images')
  EXECUTE FUNCTION update_product_image_urls();

-- Function to update category image_url when a new category image is uploaded
CREATE OR REPLACE FUNCTION update_category_image_url()
RETURNS TRIGGER AS $$
DECLARE
  category_id UUID;
BEGIN
  -- Extract category_id from the path
  -- Path format: category_id.extension
  category_id := (regexp_match(NEW.name, '^([^.]+)'))[1]::UUID;
  
  -- Update the category
  UPDATE categories 
  SET image_url = get_category_image_url(category_id)
  WHERE id = category_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update category image_url when a new image is uploaded
DROP TRIGGER IF EXISTS on_category_image_upload ON storage.objects;
CREATE TRIGGER on_category_image_upload
  AFTER INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'category_images')
  EXECUTE FUNCTION update_category_image_url();

-- Helper function to enable product images access - can be called by admin users if policies aren't working
CREATE OR REPLACE FUNCTION enable_product_images_access()
RETURNS BOOLEAN AS $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if the bucket exists
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product_images') INTO bucket_exists;
  
  -- Create bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('product_images', 'product_images', true);
  END IF;
  
  -- Drop any existing policies
  DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
  DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
  
  -- Create admin management policy
  CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'product_images' AND
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    bucket_id = 'product_images' AND
    auth.jwt() ->> 'role' = 'admin'
  );
  
  -- Create public read policy
  CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product_images');
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error enabling product images access: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 