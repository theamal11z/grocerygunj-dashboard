-- This script ensures that an admin user exists in the profiles table
-- Run this in the Supabase SQL editor to fix admin access issues

-- First, ensure the profiles table has the role column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'customer';
  END IF;
END $$;

-- Check if admin user exists in auth.users but not in profiles
DO $$
DECLARE
  auth_user_id uuid;
  has_email_column boolean;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;

  -- Get the first admin email from auth.users
  SELECT id INTO auth_user_id FROM auth.users LIMIT 1;
  
  IF auth_user_id IS NOT NULL THEN
    -- Insert into profiles if not exists, with or without email based on column existence
    IF has_email_column THEN
      -- With email column
      INSERT INTO profiles (id, full_name, role, created_at, updated_at, email)
      VALUES (
        auth_user_id, 
        'Admin User',
        'admin',
        NOW(),
        NOW(),
        (SELECT email FROM auth.users WHERE id = auth_user_id)
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    ELSE
      -- Without email column
      INSERT INTO profiles (id, full_name, role, created_at, updated_at)
      VALUES (
        auth_user_id, 
        'Admin User',
        'admin',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    END IF;
    
    RAISE NOTICE 'Admin user created or updated with ID: %', auth_user_id;
  ELSE
    RAISE NOTICE 'No users found in auth.users table';
  END IF;
END $$;

-- Update all existing users to admin role for testing
UPDATE profiles SET role = 'admin' WHERE role IS NULL OR role != 'admin';

-- List all admin users
SELECT id, role, full_name FROM profiles WHERE role = 'admin'; 