-- Fix infinite recursion in profile policies
-- This migration addresses the error: "infinite recursion detected in policy for relation "profiles""

-- First, identify and drop any problematic policies on the profiles table that might cause recursion
DO $$ 
BEGIN
  -- Drop policies that might be causing recursion
  DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON profiles;
  DROP POLICY IF EXISTS "Profiles can be updated by the profile owner" ON profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
END $$;

-- Create a helper function to check admin status without using RLS policies 
-- (to avoid the circular reference)
CREATE OR REPLACE FUNCTION is_admin_direct()
RETURNS BOOLEAN AS $$
BEGIN
  -- Directly check if the current user has admin role without using RLS
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create policies for the profiles table using the direct admin check function
DO $$ 
BEGIN
  -- Basic view policy: Users can view their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles FOR SELECT
      USING (id = auth.uid());
  END IF;

  -- Admin view policy using direct function to prevent recursion
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      USING (is_admin_direct() OR id = auth.uid());
  END IF;

  -- Basic update policy: Users can update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;

  -- Admin update policy using direct function to prevent recursion
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles"
      ON profiles FOR UPDATE
      USING (is_admin_direct());
  END IF;
END $$;

-- Update offer policies to use the direct admin check function
DO $$ 
BEGIN
  -- Drop existing offer policies that might use the problematic check
  DROP POLICY IF EXISTS "Admins can create offers" ON offers;
  DROP POLICY IF EXISTS "Admins can update offers" ON offers;
  DROP POLICY IF EXISTS "Admins can delete offers" ON offers;

  -- Recreate offer policies with direct admin check
  CREATE POLICY "Admins can create offers"
    ON offers FOR INSERT
    TO authenticated
    WITH CHECK (is_admin_direct());

  CREATE POLICY "Admins can update offers"
    ON offers FOR UPDATE
    TO authenticated
    USING (is_admin_direct());

  CREATE POLICY "Admins can delete offers"
    ON offers FOR DELETE
    TO authenticated
    USING (is_admin_direct());
END $$;

-- Drop the existing function first to avoid return type error
DROP FUNCTION IF EXISTS enable_offer_admin_policies();

-- Create a helper function to enable offer policies (useful for troubleshooting)
CREATE OR REPLACE FUNCTION enable_offer_admin_policies()
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Make sure the current user is set as admin
  UPDATE profiles
  SET role = 'admin'
  WHERE id = auth.uid();
  
  -- Also fix any potential policy issues on the offers table
  BEGIN
    -- Try to drop any problematic policies if they exist
    DROP POLICY IF EXISTS "Admins can create offers" ON offers;
    DROP POLICY IF EXISTS "Admins can update offers" ON offers;
    DROP POLICY IF EXISTS "Admins can delete offers" ON offers;
    
    -- Recreate the policies using the direct admin check
    CREATE POLICY "Admins can create offers"
      ON offers FOR INSERT
      TO authenticated
      WITH CHECK (is_admin_direct());
  
    CREATE POLICY "Admins can update offers"
      ON offers FOR UPDATE
      TO authenticated
      USING (is_admin_direct());
  
    CREATE POLICY "Admins can delete offers"
      ON offers FOR DELETE
      TO authenticated
      USING (is_admin_direct());
      
    success := TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- If policy recreation fails, at least try to set the admin role
      success := FALSE;
  END;
  
  RETURN success;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 