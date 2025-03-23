/*
  # Storage and Settings Schema
  
  This file contains:
  1. Storage buckets configuration for file uploads
  2. Settings table for application configuration
  3. Additional utility functions
*/

-- First, let's include the compatibility functions to fix the settings_data issue
-- Drop problematic functions first to ensure clean slate
DROP FUNCTION IF EXISTS update_from_old_settings CASCADE;
DROP FUNCTION IF EXISTS update_settings_individual CASCADE;

-- Create a proper update_settings_individual function
CREATE OR REPLACE FUNCTION update_settings_individual(
  old_settings jsonb
) RETURNS void AS $$
DECLARE
  rec record;
BEGIN
  -- For each key-value pair in the JSONB object
  FOR rec IN SELECT * FROM jsonb_each(old_settings)
  LOOP
    BEGIN
      -- Direct SQL approach for reliable updates
      INSERT INTO settings (key, value)
      VALUES (rec.key, rec.value)
      ON CONFLICT (key) DO UPDATE 
      SET value = rec.value,
          updated_at = now();
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE 'Settings table does not exist, skipping update for key %', rec.key;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error updating individual setting %: %', rec.key, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a proper update_from_old_settings function
CREATE OR REPLACE FUNCTION update_from_old_settings()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Make sure we're only processing when the settings_data field exists
    IF TG_OP IN ('UPDATE', 'INSERT') AND NEW IS NOT NULL AND NEW.settings_data IS NOT NULL THEN
      -- Update the individual settings
      PERFORM update_settings_individual(NEW.settings_data);
    END IF;
  EXCEPTION
    WHEN undefined_column THEN
      -- Handle case where settings_data column doesn't exist
      RAISE NOTICE 'Column settings_data not found in NEW record';
    WHEN OTHERS THEN
      RAISE NOTICE 'Error in update_from_old_settings: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now proceed with the rest of the file
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

-- BACKWARDS COMPATIBILITY: Create old settings table structure for compatibility
-- This is the original public.settings table with settings_data column
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on the legacy settings table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for the legacy settings table
DO $$ 
BEGIN
  -- Everyone can view settings
  CREATE POLICY "Settings are viewable by everyone"
    ON public.settings FOR SELECT
    TO authenticated
    USING (true);

  -- Only admins can modify settings
  CREATE POLICY "Admins can modify settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
EXCEPTION 
  WHEN duplicate_object THEN 
    NULL; -- Policy already exists, ignore
END $$;

-- Create settings table for application configuration (new format)
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

-- BACKWARDS COMPATIBILITY: Function to get all settings as a JSONB object
CREATE OR REPLACE FUNCTION get_aggregated_settings()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO result 
  FROM settings;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BACKWARDS COMPATIBILITY: Function to ensure settings_data has a row
CREATE OR REPLACE FUNCTION ensure_settings_row()
RETURNS void AS $$
DECLARE
  settings_count int;
  current_settings jsonb;
BEGIN
  BEGIN
    -- Log for debugging
    RAISE NOTICE 'ensure_settings_row called';
    
    -- Get current key-value settings
    SELECT get_aggregated_settings() INTO current_settings;
    RAISE NOTICE 'Current aggregated settings: %', current_settings;
    
    -- Check if we need to insert a row
    SELECT COUNT(*) INTO settings_count FROM public.settings;
    RAISE NOTICE 'Found % existing rows in public.settings', settings_count;
    
    IF settings_count = 0 THEN
      RAISE NOTICE 'No settings row found, creating new one with aggregated settings';
      INSERT INTO public.settings (settings_data)
      VALUES (current_settings);
      RAISE NOTICE 'Created new settings row';
    ELSE
      RAISE NOTICE 'Settings row already exists, skipping creation';
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'public.settings table does not exist yet, skipping initialization';
    WHEN OTHERS THEN
      RAISE NOTICE 'Error ensuring settings row: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BACKWARDS COMPATIBILITY: Update function for old settings
CREATE OR REPLACE FUNCTION update_old_settings()
RETURNS TRIGGER AS $$
DECLARE
  aggregated_settings jsonb;
BEGIN
  BEGIN
    -- Log for debugging
    RAISE NOTICE 'update_old_settings trigger fired';
    
    -- Get the aggregated settings from the key-value table
    SELECT get_aggregated_settings() INTO aggregated_settings;
    
    -- Check if we successfully got the settings
    IF aggregated_settings IS NULL OR aggregated_settings = '{}'::jsonb THEN
      RAISE NOTICE 'No settings found in key-value table, or get_aggregated_settings returned empty';
    ELSE
      RAISE NOTICE 'Got aggregated settings: %', aggregated_settings;
    END IF;
    
    -- Create default row if it doesn't exist
    PERFORM ensure_settings_row();
    
    -- Update the settings_data column with aggregated key-value pairs
    UPDATE public.settings
    SET settings_data = aggregated_settings,
        updated_at = now();
        
    RAISE NOTICE 'Updated old settings table with new data';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error updating old settings: %', SQLERRM;
  END;
        
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BACKWARDS COMPATIBILITY: Update function for new settings
CREATE OR REPLACE FUNCTION update_new_settings()
RETURNS TRIGGER AS $$
DECLARE
  rec record;
BEGIN
  -- Log what's happening for debugging
  RAISE NOTICE 'update_new_settings trigger fired for table public.settings';
  
  IF NEW.settings_data IS NULL THEN
    RAISE NOTICE 'NEW.settings_data is NULL, skipping update';
    RETURN NEW;
  END IF;
  
  -- Verify the format of settings_data
  IF jsonb_typeof(NEW.settings_data) != 'object' THEN
    RAISE NOTICE 'NEW.settings_data is not a JSONB object, skipping update';
    RETURN NEW;
  END IF;
  
  -- For each key-value pair, update the new settings table
  BEGIN
    -- Delete existing settings to avoid stale data
    -- This is a more reliable approach than just updating existing keys
    RAISE NOTICE 'Refreshing key-value settings from settings_data';
    
    -- Iterate through each key-value pair using the correct PL/pgSQL syntax
    FOR rec IN SELECT * FROM jsonb_each(NEW.settings_data)
    LOOP
      -- Insert or update each setting
      INSERT INTO settings (key, value)
      VALUES (rec.key, rec.value)
      ON CONFLICT (key) DO UPDATE 
      SET value = EXCLUDED.value,
          updated_at = now();
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error updating key-value settings: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BACKWARDS COMPATIBILITY: Create triggers to sync both tables
DO $$ 
BEGIN
  -- Drop triggers first to avoid errors on recreation
  DROP TRIGGER IF EXISTS update_old_settings_trigger ON settings;
  DROP TRIGGER IF EXISTS update_new_settings_trigger ON public.settings;
  
  -- Create trigger on new settings table
  CREATE TRIGGER update_old_settings_trigger
    AFTER INSERT OR UPDATE ON settings
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_old_settings();
    
  -- Create trigger on old settings table  
  CREATE TRIGGER update_new_settings_trigger
    AFTER UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_new_settings();
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating triggers: %', SQLERRM;
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

-- BACKWARDS COMPATIBILITY: Update the original save_settings function to also update the old format
DROP FUNCTION IF EXISTS save_settings_with_compatibility;
CREATE OR REPLACE FUNCTION save_settings_with_compatibility(setting_key text, setting_value jsonb, setting_description text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Use the standard save_settings function to update the key-value table
  BEGIN
    INSERT INTO settings (key, value, description)
    VALUES (setting_key, setting_value, setting_description)
    ON CONFLICT (key) 
    DO UPDATE SET 
      value = setting_value,
      description = COALESCE(setting_description, settings.description),
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error inserting into settings table: %', SQLERRM;
  END;
  
  -- Now update the old settings table safely
  BEGIN
    -- Ensure the old settings table is synchronized
    PERFORM ensure_settings_row();
    
    -- Update the settings_data field
    UPDATE public.settings 
    SET settings_data = jsonb_set(settings_data, ARRAY[setting_key], setting_value),
        updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error updating old settings format: %', SQLERRM;
      -- Continue execution even if the old format update fails
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for settings updated_at
-- First drop the trigger if it exists to avoid the "already exists" error
DO $$
BEGIN
  -- Check if the trigger exists before trying to drop it
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_settings_updated_at' 
    AND tgrelid = 'settings'::regclass
  ) THEN
    DROP TRIGGER update_settings_updated_at ON settings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error checking trigger: %', SQLERRM;
END $$;

-- Create the update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- BACKWARDS COMPATIBILITY: Initialize the legacy settings table with current data
DO $$ 
BEGIN
  -- Make sure the old settings table has a row and is up to date
  PERFORM ensure_settings_row();
END $$;

-- Insert default settings
DO $$ BEGIN
  PERFORM save_settings_with_compatibility(
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

  PERFORM save_settings_with_compatibility(
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

-- BACKWARDS COMPATIBILITY: Create diagnostic function for troubleshooting settings
DROP FUNCTION IF EXISTS diagnose_settings_sync();
CREATE OR REPLACE FUNCTION diagnose_settings_sync()
RETURNS TABLE(
  table_name text,
  record_count int,
  settings_data jsonb,
  sync_status text
) AS $$
DECLARE
  old_settings jsonb;
  new_settings jsonb;
  diff jsonb;
BEGIN
  -- Get data from old settings table
  SELECT public.settings.settings_data INTO old_settings FROM public.settings LIMIT 1;
  
  -- Get aggregated data from new settings table
  SELECT get_aggregated_settings() INTO new_settings;
  
  -- Return information about the old settings table
  RETURN QUERY
  SELECT 
    'public.settings (old format)' as table_name,
    COUNT(*)::int as record_count,
    settings_data,
    CASE 
      WHEN old_settings = new_settings THEN 'Synchronized ✓'
      ELSE 'Not synchronized ✗'
    END as sync_status
  FROM public.settings;

  -- Return information about the new settings table
  RETURN QUERY
  SELECT 
    'settings (new format)' as table_name,
    COUNT(*)::int as record_count,
    get_aggregated_settings() as settings_data,
    CASE 
      WHEN old_settings = new_settings THEN 'Synchronized ✓'
      ELSE 'Not synchronized ✗'
    END as sync_status
  FROM settings;
  
  -- If tables are out of sync, attempt to fix them
  IF old_settings IS DISTINCT FROM new_settings THEN
    -- Sync old to new
    PERFORM update_new_settings();
    -- Sync new to old
    PERFORM update_old_settings();
    
    -- Return information about the actions taken
    RETURN QUERY
    SELECT 
      'FIX: Auto-sync attempted' as table_name,
      NULL::int as record_count,
      NULL::jsonb as settings_data,
      'Manual check required' as sync_status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an RPC function for the frontend to update settings
CREATE OR REPLACE FUNCTION update_settings(settings_json jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  settings_id uuid;
  err_context text;
BEGIN
  -- Log input for debugging
  RAISE NOTICE 'update_settings called with: %', settings_json;
  
  IF settings_json IS NULL THEN
    RAISE EXCEPTION 'Settings JSON cannot be NULL';
  END IF;
  
  -- Get the ID of the first settings row if it exists
  BEGIN
    SELECT id INTO settings_id FROM public.settings LIMIT 1;
    RAISE NOTICE 'Found settings ID: %', settings_id;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
    RAISE NOTICE 'Error getting settings ID: % (Context: %)', SQLERRM, err_context;
    settings_id := NULL;
  END;
  
  IF settings_id IS NULL THEN
    -- Create new settings record if none exists
    RAISE NOTICE 'No existing settings found, creating new record';
    BEGIN
      INSERT INTO public.settings (settings_data)
      VALUES (settings_json)
      RETURNING settings_data INTO result;
      RAISE NOTICE 'Created new settings with data: %', result;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
      RAISE NOTICE 'Error creating settings: % (Context: %)', SQLERRM, err_context;
      RETURN jsonb_build_object('error', SQLERRM);
    END;
  ELSE
    -- Update existing settings
    RAISE NOTICE 'Updating existing settings with ID: %', settings_id;
    BEGIN
      UPDATE public.settings
      SET settings_data = settings_json,
          updated_at = now()
      WHERE id = settings_id
      RETURNING settings_data INTO result;
      RAISE NOTICE 'Updated settings, new data: %', result;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
      RAISE NOTICE 'Error updating settings: % (Context: %)', SQLERRM, err_context;
      RETURN jsonb_build_object('error', SQLERRM);
    END;
  END IF;
  
  -- Force sync between old and new formats
  BEGIN
    -- Manually trigger update to the new table format
    RAISE NOTICE 'Performing manual sync to key-value table';
    PERFORM update_settings_individual(settings_json);
    
    -- Log for debugging
    RAISE NOTICE 'Manual sync to key-value table completed';
    
    -- Return the updated settings
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
    RAISE NOTICE 'Error during manual sync: % (Context: %)', SQLERRM, err_context;
    -- We still return the result since the main update was successful
    RETURN result;
  END;
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
    RAISE NOTICE 'Unhandled error in update_settings RPC: % (Context: %)', SQLERRM, err_context;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function for direct update of settings used by client-side fallback
DROP FUNCTION IF EXISTS save_settings(uuid, jsonb);
CREATE OR REPLACE FUNCTION save_settings(settings_id uuid, settings_json jsonb)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update the settings by ID
  UPDATE public.settings
  SET settings_data = settings_json,
      updated_at = now()
  WHERE id = settings_id
  RETURNING settings_data INTO result;
  
  -- Return the updated settings
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in save_settings RPC: %', SQLERRM;
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 