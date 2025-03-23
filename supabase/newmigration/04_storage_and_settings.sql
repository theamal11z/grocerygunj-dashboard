/*
  # Storage and Settings Schema
  
  This file contains:
  1. Storage buckets configuration for file uploads
  2. Settings table for application configuration
  3. Additional utility functions
*/

-- Create storage buckets for file uploads
DO $$ 
BEGIN
  -- Product Images Bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'product_images',
    'product_images',
    true,
    5242880, -- 5MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;

  -- Category Images Bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'category_images',
    'category_images',
    true,
    5242880, -- 5MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;

  -- Avatar Images Bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create RLS policies for storage buckets
DO $$ 
DECLARE
  bucket_name text;
BEGIN
  -- Create policies for product_images bucket
  BEGIN
    -- Read access for all authenticated users
    PERFORM storage.create_policy(
      'product_images',
      'Read Product Images',
      'SELECT',
      'authenticated',
      true,
      null::text
    );
    
    -- Insert access for admins only
    PERFORM storage.create_policy(
      'product_images',
      'Admin Product Image Upload',
      'INSERT',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
    
    -- Update access for admins only
    PERFORM storage.create_policy(
      'product_images',
      'Admin Product Image Update',
      'UPDATE',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
    
    -- Delete access for admins only
    PERFORM storage.create_policy(
      'product_images',
      'Admin Product Image Delete',
      'DELETE',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for product_images bucket: %', SQLERRM;
  END;
  
  -- Create policies for category_images bucket
  BEGIN
    -- Read access for all authenticated users
    PERFORM storage.create_policy(
      'category_images',
      'Read Category Images',
      'SELECT',
      'authenticated',
      true,
      null::text
    );
    
    -- Insert access for admins only
    PERFORM storage.create_policy(
      'category_images',
      'Admin Category Image Upload',
      'INSERT',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
    
    -- Update access for admins only
    PERFORM storage.create_policy(
      'category_images',
      'Admin Category Image Update',
      'UPDATE',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
    
    -- Delete access for admins only
    PERFORM storage.create_policy(
      'category_images',
      'Admin Category Image Delete',
      'DELETE',
      'authenticated',
      'EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin'')',
      null::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for category_images bucket: %', SQLERRM;
  END;
  
  -- Create policies for avatars bucket
  BEGIN
    -- Read access for all authenticated users
    PERFORM storage.create_policy(
      'avatars',
      'Read Avatar Images',
      'SELECT',
      'authenticated',
      true,
      null::text
    );
    
    -- Users can only insert their own avatars
    PERFORM storage.create_policy(
      'avatars',
      'User Avatar Upload',
      'INSERT',
      'authenticated',
      '(storage.foldername(name))[1] = auth.uid()::text',
      null::text
    );
    
    -- Users can only update their own avatars
    PERFORM storage.create_policy(
      'avatars',
      'User Avatar Update',
      'UPDATE',
      'authenticated',
      '(storage.foldername(name))[1] = auth.uid()::text',
      null::text
    );
    
    -- Users can only delete their own avatars
    PERFORM storage.create_policy(
      'avatars',
      'User Avatar Delete',
      'DELETE',
      'authenticated',
      '(storage.foldername(name))[1] = auth.uid()::text',
      null::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating policies for avatars bucket: %', SQLERRM;
  END;
END $$;

-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for settings
DO $$ BEGIN
  -- Everyone can view settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Settings are viewable by everyone'
  ) THEN
    CREATE POLICY "Settings are viewable by everyone"
      ON settings FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Only admins can modify settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'settings' 
    AND policyname = 'Admins can modify settings'
  ) THEN
    CREATE POLICY "Admins can modify settings"
      ON settings FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Create function to save settings
CREATE OR REPLACE FUNCTION save_settings(setting_key text, setting_value jsonb, setting_description text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO settings (key, value, description)
  VALUES (setting_key, setting_value, setting_description)
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = setting_value,
    description = COALESCE(setting_description, settings.description),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default settings
DO $$ BEGIN
  PERFORM save_settings(
    'site_config',
    jsonb_build_object(
      'site_name', 'Modern Admin Suite',
      'currency', 'USD',
      'currency_symbol', '$',
      'theme', 'light',
      'logo_url', '',
      'contact_email', 'support@example.com',
      'contact_phone', '+1-800-123-4567',
      'facebook_url', 'https://facebook.com/example',
      'twitter_url', 'https://twitter.com/example',
      'instagram_url', 'https://instagram.com/example'
    ),
    'Main site configuration settings'
  );

  PERFORM save_settings(
    'delivery_config',
    jsonb_build_object(
      'free_delivery_threshold', 50,
      'standard_delivery_fee', 5.99,
      'express_delivery_fee', 12.99,
      'delivery_time_standard', '3-5 days',
      'delivery_time_express', '1-2 days'
    ),
    'Delivery and shipping configuration'
  );
END $$; 