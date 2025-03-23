-- Enable RLS on offers table
ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;

-- Drop existing offers policies if they exist
DROP POLICY IF EXISTS "allow_public_read_offers" ON "public"."offers";
DROP POLICY IF EXISTS "allow_admin_full_access_offers" ON "public"."offers";

-- Create policy to allow all users to view offers
CREATE POLICY "allow_public_read_offers" ON "public"."offers"
FOR SELECT
TO public
USING (true);

-- Create policy to allow admin users to manage offers
CREATE POLICY "allow_admin_full_access_offers" ON "public"."offers"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) OR
  -- Use the is_admin function if it exists
  (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) OR
  -- Use the is_admin function if it exists
  (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
);

-- Create helper function for diagnostics and permission fixing
CREATE OR REPLACE FUNCTION enable_offer_admin_policies()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Make sure offers table has RLS enabled
  ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;
  
  -- Recreate policies
  DROP POLICY IF EXISTS "allow_public_read_offers" ON "public"."offers";
  DROP POLICY IF EXISTS "allow_admin_full_access_offers" ON "public"."offers";
  
  CREATE POLICY "allow_public_read_offers" ON "public"."offers"
  FOR SELECT
  TO public
  USING (true);
  
  CREATE POLICY "allow_admin_full_access_offers" ON "public"."offers"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ) OR
    -- Use the is_admin function if it exists
    (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    ) OR
    -- Use the is_admin function if it exists
    (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
  );
  
  RETURN 'Offer policies successfully configured';
END;
$$; 