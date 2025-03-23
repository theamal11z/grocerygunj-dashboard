-- Add RLS policies for categories to allow admin users to manage them

-- Policy for admins to insert categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Admins can insert categories'
  ) THEN
    CREATE POLICY "Admins can insert categories"
      ON categories FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        ) OR
        -- Use the is_admin function if it exists
        (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
      );
  END IF;
END $$;

-- Policy for admins to update categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Admins can update categories'
  ) THEN
    CREATE POLICY "Admins can update categories"
      ON categories FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        ) OR
        -- Use the is_admin function if it exists
        (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
      );
  END IF;
END $$;

-- Policy for admins to delete categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'categories' 
    AND policyname = 'Admins can delete categories'
  ) THEN
    CREATE POLICY "Admins can delete categories"
      ON categories FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        ) OR
        -- Use the is_admin function if it exists
        (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') AND is_admin())
      );
  END IF;
END $$;

-- Helper function to enable all category admin policies
CREATE OR REPLACE FUNCTION enable_category_admin_policies()
RETURNS BOOLEAN AS $$
BEGIN
  -- Drop any existing policies
  DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
  DROP POLICY IF EXISTS "Admins can update categories" ON categories;
  DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
  
  -- Create policy for admins to insert categories
  CREATE POLICY "Admins can insert categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  
  -- Create policy for admins to update categories
  CREATE POLICY "Admins can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  
  -- Create policy for admins to delete categories
  CREATE POLICY "Admins can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error enabling category admin policies: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 