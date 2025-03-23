-- Fix for infinite recursion in RLS policies for admin users
-- This script modifies the existing admin policies to prevent recursion

-- First, drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all wishlists" ON wishlists;
DROP POLICY IF EXISTS "Admins can view all addresses" ON addresses;
DROP POLICY IF EXISTS "Admins can view all payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all cart items" ON cart_items;

-- Create a function to check admin status safely
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

-- Re-create admin policies using the function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all wishlists"
  ON wishlists FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can view all payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can view all cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

-- Grant admin role to all existing users for testing (remove in production)
-- UPDATE profiles SET role = 'admin' WHERE role IS NULL OR role != 'admin';