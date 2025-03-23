/*
  # Admin User Seeding
  
  This file contains utilities for ensuring admin users are properly set up:
  1. Admin user creation and verification
  2. Helper functions for troubleshooting admin access
  3. Utilities for testing admin roles
*/

-- Make sure an admin user exists in the profiles table
DO $$ 
DECLARE
  auth_user_id uuid;
  auth_user_email text;
  has_email_column boolean;
  user_count int;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;

  -- Count users in auth.users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  RAISE NOTICE 'Found % users in auth.users table', user_count;
  
  -- Get the first user from auth.users
  SELECT id, email INTO auth_user_id, auth_user_email FROM auth.users LIMIT 1;
  
  IF auth_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user with ID: % and email: %', auth_user_id, auth_user_email;
    
    -- Insert into profiles if not exists, with or without email based on column existence
    IF has_email_column THEN
      -- With email column
      INSERT INTO profiles (id, full_name, role, created_at, updated_at, email)
      VALUES (
        auth_user_id, 
        COALESCE(
          (SELECT full_name FROM profiles WHERE id = auth_user_id),
          'Admin User'
        ),
        'admin',
        NOW(),
        NOW(),
        auth_user_email
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        email = auth_user_email,
        updated_at = NOW();
    ELSE
      -- Without email column
      INSERT INTO profiles (id, full_name, role, created_at, updated_at)
      VALUES (
        auth_user_id, 
        COALESCE(
          (SELECT full_name FROM profiles WHERE id = auth_user_id),
          'Admin User'
        ),
        'admin',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    END IF;
    
    -- Verify the profile was created
    IF EXISTS (SELECT 1 FROM profiles WHERE id = auth_user_id AND role = 'admin') THEN
      RAISE NOTICE 'Admin user created or updated successfully with ID: %', auth_user_id;
    ELSE
      RAISE NOTICE 'Failed to create or update admin user';
    END IF;
    
    -- Add more users as admins (if appropriate for the environment)
    -- This section could be conditionally executed based on environment
  ELSE
    RAISE NOTICE 'No users found in auth.users table';
  END IF;
END $$;

-- Ensure all profiles have an email field that matches auth.users
DO $$
DECLARE
  has_email_column boolean;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;
  
  IF has_email_column THEN
    -- Update all profiles to ensure email matches auth.users
    UPDATE profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email <> u.email);
    
    RAISE NOTICE 'Updated profile emails to match auth.users';
  END IF;
END $$;

-- Helper function to verify and report admin status
CREATE OR REPLACE FUNCTION verify_admin_access(user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_exists boolean,
  is_admin boolean,
  user_role text,
  auth_user_id uuid,
  email text,
  email_in_profile text
) AS $$
DECLARE
  target_id uuid;
  has_email_column boolean;
BEGIN
  -- If no user ID is passed, use the current authenticated user
  IF user_id IS NULL THEN
    target_id := auth.uid();
  ELSE
    target_id := user_id;
  END IF;
  
  -- Check if email column exists in profiles
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;
  
  -- Return different query based on email column existence
  IF has_email_column THEN
    RETURN QUERY
    SELECT 
      EXISTS(SELECT 1 FROM profiles WHERE id = target_id) AS user_exists,
      (SELECT role = 'admin' FROM profiles WHERE id = target_id) AS is_admin,
      (SELECT role FROM profiles WHERE id = target_id) AS user_role,
      target_id AS auth_user_id,
      (SELECT email FROM auth.users WHERE id = target_id) AS email,
      (SELECT email FROM profiles WHERE id = target_id) AS email_in_profile;
  ELSE
    RETURN QUERY
    SELECT 
      EXISTS(SELECT 1 FROM profiles WHERE id = target_id) AS user_exists,
      (SELECT role = 'admin' FROM profiles WHERE id = target_id) AS is_admin,
      (SELECT role FROM profiles WHERE id = target_id) AS user_role,
      target_id AS auth_user_id,
      (SELECT email FROM auth.users WHERE id = target_id) AS email,
      NULL::text AS email_in_profile;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant admin access to a specific user
CREATE OR REPLACE FUNCTION grant_admin_access(target_email text)
RETURNS boolean AS $$
DECLARE
  target_id uuid;
  success boolean := false;
  has_email_column boolean;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;

  -- Find the user ID by email
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  
  IF target_id IS NOT NULL THEN
    -- Update or insert the profile with admin role
    IF has_email_column THEN
      INSERT INTO profiles (id, role, updated_at, email)
      VALUES (target_id, 'admin', NOW(), target_email)
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        email = target_email,
        updated_at = NOW();
    ELSE
      INSERT INTO profiles (id, role, updated_at)
      VALUES (target_id, 'admin', NOW())
      ON CONFLICT (id) 
      DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    END IF;
      
    success := true;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list all admin users in the system
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  profile_email text,
  created_at timestamptz
) AS $$
DECLARE
  has_email_column boolean;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;
  
  IF has_email_column THEN
    RETURN QUERY
    SELECT 
      p.id AS user_id,
      p.full_name,
      u.email,
      p.email AS profile_email,
      p.created_at
    FROM 
      profiles p
    JOIN
      auth.users u ON p.id = u.id
    WHERE 
      p.role = 'admin'
    ORDER BY 
      p.created_at;
  ELSE
    RETURN QUERY
    SELECT 
      p.id AS user_id,
      p.full_name,
      u.email,
      NULL::text AS profile_email,
      p.created_at
    FROM 
      profiles p
    JOIN
      auth.users u ON p.id = u.id
    WHERE 
      p.role = 'admin'
    ORDER BY 
      p.created_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a specific user and set as admin (only for development/testing)
DO $$ 
DECLARE
  new_user_id uuid;
  has_email_column boolean;
BEGIN
  -- First check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'theamal11z@rex.com';
  
  IF new_user_id IS NULL THEN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Create the user in auth.users with a hashed password
    -- Note: In production, you would never put passwords directly in SQL scripts
    -- This is for development/testing purposes only
    INSERT INTO auth.users (
      id,
      email,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      encrypted_password
    )
    VALUES (
      new_user_id,
      'theamal11z@rex.com',
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      -- This is a demonstration - in production, NEVER store passwords in SQL files
      crypt('maothiskian', gen_salt('bf'))
    );
    
    RAISE NOTICE 'Created new user with ID: %', new_user_id;
  ELSE
    RAISE NOTICE 'User already exists with ID: %', new_user_id;
  END IF;
  
  -- Check if email column exists in profiles
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_column;
  
  -- Create or update profile
  IF has_email_column THEN
    INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
      new_user_id,
      'theamal11z@rex.com',
      'The Amal User',
      'admin',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = 'theamal11z@rex.com',
      role = 'admin',
      updated_at = NOW();
  ELSE
    INSERT INTO profiles (id, full_name, role, created_at, updated_at)
    VALUES (
      new_user_id,
      'The Amal User',
      'admin',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
      role = 'admin',
      updated_at = NOW();
  END IF;
  
  -- Verify the user was created and has admin access
  RAISE NOTICE 'User profile created or updated with admin access. Use verify_admin_access() to confirm.';
END $$; 