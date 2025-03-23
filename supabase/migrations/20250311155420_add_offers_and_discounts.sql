-- Add role column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  code text NOT NULL UNIQUE,
  discount text NOT NULL,
  description text,
  valid_until timestamptz NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Add discount column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount integer;

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers
DO $$ BEGIN
  -- View policy (authenticated users can view all offers)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Offers are viewable by everyone'
  ) THEN
    CREATE POLICY "Offers are viewable by everyone"
      ON offers FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Insert policy (only admins can create offers)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can create offers'
  ) THEN
    CREATE POLICY "Admins can create offers"
      ON offers FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- Update policy (only admins can update offers)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can update offers'
  ) THEN
    CREATE POLICY "Admins can update offers"
      ON offers FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- Delete policy (only admins can delete offers)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offers' 
    AND policyname = 'Admins can delete offers'
  ) THEN
    CREATE POLICY "Admins can delete offers"
      ON offers FOR DELETE
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

-- Create index for faster offer code lookups
CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code);

-- Create index for faster valid offer lookups
CREATE INDEX IF NOT EXISTS idx_offers_valid_until ON offers(valid_until);

-- Add index for faster querying of discounted products
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount)
WHERE discount IS NOT NULL;

-- Set first user as admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM profiles
  ORDER BY created_at
  LIMIT 1
);

-- Add some sample offers if they don't exist
INSERT INTO offers (title, code, discount, description, valid_until, image_url)
VALUES 
  (
    'Welcome Offer',
    'WELCOME20',
    '20% OFF',
    'Get 20% off on your first order',
    now() + interval '30 days',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'
  ),
  (
    'Weekend Special',
    'WEEKEND25',
    '25% OFF',
    'Special weekend discount on all fruits',
    now() + interval '7 days',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2070&auto=format&fit=crop'
  ),
  (
    'Summer Sale',
    'SUMMER30',
    '30% OFF',
    'Beat the heat with cool summer discounts',
    now() + interval '60 days',
    'https://images.unsplash.com/photo-1534531173927-aeb928d54385?q=80&w=2070&auto=format&fit=crop'
  )
ON CONFLICT (code) DO NOTHING;

-- Update some sample products with discounts
UPDATE products 
SET discount = CASE 
  WHEN random() < 0.3 THEN (ARRAY[10, 15, 20, 25, 30])[floor(random() * 5 + 1)]
  ELSE NULL 
END
WHERE discount IS NULL; 