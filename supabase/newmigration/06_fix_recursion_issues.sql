/*
  # Fix Recursion Issues
  
  This file contains fixes for infinite recursion issues in RLS policies:
  1. Profile policy recursion fixes
  2. Offer policy recursion fixes
  3. Admin check functions that prevent circular references
*/

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

-- Create a more general admin check function with error handling
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Direct query to profiles without using RLS policies
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix profile policies to prevent recursion
DO $$ 
BEGIN
  -- First, remove the old policies if they exist
  DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON profiles;
  DROP POLICY IF EXISTS "Profiles can be updated by the profile owner" ON profiles;
  
  -- Update or create the view/select policies using conditional logic
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    -- Update existing policy instead of recreating it
    ALTER POLICY "Users can view own profile" 
    ON profiles 
    USING (id = auth.uid());
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can view all profiles'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all profiles" 
    ON profiles 
    USING (is_admin_direct() OR id = auth.uid());
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      USING (is_admin_direct() OR id = auth.uid());
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Users can update own profile" 
    ON profiles 
    USING (id = auth.uid());
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can update all profiles'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can update all profiles" 
    ON profiles 
    USING (is_admin_direct());
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can update all profiles"
      ON profiles FOR UPDATE
      USING (is_admin_direct());
  END IF;
END $$;

-- Fix offer policies to prevent recursion
DO $$ 
BEGIN
  -- Check and update offer policies with direct admin check
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can create offers'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can create offers"
      ON offers
      WITH CHECK (is_admin_direct());
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can create offers"
      ON offers FOR INSERT
      TO authenticated
      WITH CHECK (is_admin_direct());
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can update offers'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can update offers"
      ON offers
      USING (is_admin_direct());
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can update offers"
      ON offers FOR UPDATE
      TO authenticated
      USING (is_admin_direct());
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can delete offers'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can delete offers"
      ON offers
      USING (is_admin_direct());
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can delete offers"
      ON offers FOR DELETE
      TO authenticated
      USING (is_admin_direct());
  END IF;
END $$;

-- Update all admin policies to use the safe admin check
DO $$ 
BEGIN
  -- Orders policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Admins can view all orders'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all orders"
      ON orders
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all orders"
      ON orders FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
  
  -- Order items policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Admins can view all order items'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all order items"
      ON order_items
      USING (is_admin() OR EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
      ));
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all order items"
      ON order_items FOR SELECT
      TO authenticated
      USING (is_admin() OR EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_items.order_id 
        AND orders.user_id = auth.uid()
      ));
  END IF;
  
  -- Wishlists policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wishlists' 
    AND policyname = 'Admins can view all wishlists'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all wishlists"
      ON wishlists
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all wishlists"
      ON wishlists FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
  
  -- Addresses policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'addresses' 
    AND policyname = 'Admins can view all addresses'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all addresses"
      ON addresses
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all addresses"
      ON addresses FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
  
  -- Payment methods policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Admins can view all payment methods'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all payment methods"
      ON payment_methods
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all payment methods"
      ON payment_methods FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
  
  -- Notifications policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Admins can view all notifications'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all notifications"
      ON notifications
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
  
  -- Cart items policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Admins can view all cart items'
  ) THEN
    -- Update existing policy
    ALTER POLICY "Admins can view all cart items"
      ON cart_items
      USING (is_admin() OR auth.uid() = user_id);
  ELSE
    -- Create new policy
    CREATE POLICY "Admins can view all cart items"
      ON cart_items FOR SELECT
      TO authenticated
      USING (is_admin() OR auth.uid() = user_id);
  END IF;
END $$;

-- Helper function for enabling offer admin policies (useful for troubleshooting)
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
    -- Use conditional policy management for offers table
    -- Create/update policies using the direct admin check
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'offers' 
      AND policyname = 'Admins can create offers'
    ) THEN
      -- Update existing policy
      ALTER POLICY "Admins can create offers"
        ON offers
        WITH CHECK (is_admin_direct());
    ELSE
      -- Create new policy
      CREATE POLICY "Admins can create offers"
        ON offers FOR INSERT
        TO authenticated
        WITH CHECK (is_admin_direct());
    END IF;
  
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'offers' 
      AND policyname = 'Admins can update offers'
    ) THEN
      -- Update existing policy
      ALTER POLICY "Admins can update offers"
        ON offers
        USING (is_admin_direct());
    ELSE
      -- Create new policy
      CREATE POLICY "Admins can update offers"
        ON offers FOR UPDATE
        TO authenticated
        USING (is_admin_direct());
    END IF;
  
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'offers' 
      AND policyname = 'Admins can delete offers'
    ) THEN
      -- Update existing policy
      ALTER POLICY "Admins can delete offers"
        ON offers
        USING (is_admin_direct());
    ELSE
      -- Create new policy
      CREATE POLICY "Admins can delete offers"
        ON offers FOR DELETE
        TO authenticated
        USING (is_admin_direct());
    END IF;
      
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