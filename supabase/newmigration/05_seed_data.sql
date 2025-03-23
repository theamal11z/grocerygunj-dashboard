/*
  # Seed Data
  
  This file contains initial data for the application:
  1. Sample categories
  2. Sample products
  3. Sample offers
  4. Sample admin user
*/

-- Add unique constraint on categories name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'categories_name_key' 
    AND conrelid = 'categories'::regclass
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
  END IF;
END $$;

-- Sample Categories
INSERT INTO categories (name, image_url)
VALUES 
  ('Fruits', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2070&auto=format&fit=crop'),
  ('Vegetables', 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=2069&auto=format&fit=crop'),
  ('Dairy', 'https://images.unsplash.com/photo-1628689469838-524a4a973b8e?q=80&w=2080&auto=format&fit=crop'),
  ('Bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop'),
  ('Meat', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=2070&auto=format&fit=crop'),
  ('Beverages', 'https://images.unsplash.com/photo-1596803244536-ded26f55a3a4?q=80&w=2070&auto=format&fit=crop'),
  ('Snacks', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?q=80&w=2070&auto=format&fit=crop'),
  ('Frozen Foods', 'https://images.unsplash.com/photo-1584742171424-73270dc4399e?q=80&w=2070&auto=format&fit=crop')
ON CONFLICT DO NOTHING;

-- Sample Offers
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

-- Sample Products
INSERT INTO products (
  name, 
  description, 
  price, 
  category_id, 
  image_urls, 
  in_stock, 
  unit, 
  nutrition, 
  discount
)
VALUES 
  (
    'Fresh Apples',
    'Sweet and juicy red apples, perfect for snacking or baking.',
    2.99,
    (SELECT id FROM categories WHERE name = 'Fruits' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?q=80&w=2070&auto=format&fit=crop'],
    true,
    'kg',
    '{"calories": 52, "protein": 0.3, "carbohydrates": 14, "fat": 0.2, "fiber": 2.4}'::jsonb,
    10
  ),
  (
    'Organic Bananas',
    'Organic bananas grown without pesticides, rich in potassium.',
    1.99,
    (SELECT id FROM categories WHERE name = 'Fruits' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1603833665858-e61d17a86224?q=80&w=2073&auto=format&fit=crop'],
    true,
    'kg',
    '{"calories": 89, "protein": 1.1, "carbohydrates": 22.8, "fat": 0.3, "fiber": 2.6}'::jsonb,
    NULL
  ),
  (
    'Fresh Spinach',
    'Leafy green vegetable, packed with iron and vitamins.',
    1.49,
    (SELECT id FROM categories WHERE name = 'Vegetables' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=2080&auto=format&fit=crop'],
    true,
    'bunch',
    '{"calories": 23, "protein": 2.9, "carbohydrates": 3.6, "fat": 0.4, "fiber": 2.2}'::jsonb,
    NULL
  ),
  (
    'Organic Whole Milk',
    'Fresh organic whole milk from grass-fed cows.',
    3.49,
    (SELECT id FROM categories WHERE name = 'Dairy' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=2070&auto=format&fit=crop'],
    true,
    'liter',
    '{"calories": 146, "protein": 7.7, "carbohydrates": 11.7, "fat": 7.9, "calcium": "28% DV"}'::jsonb,
    NULL
  ),
  (
    'Sourdough Bread',
    'Artisanal sourdough bread, freshly baked daily.',
    4.99,
    (SELECT id FROM categories WHERE name = 'Bakery' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1585478259715-4daf084hez8s3b?q=80&w=2148&auto=format&fit=crop'],
    true,
    'loaf',
    '{"calories": 289, "protein": 9.5, "carbohydrates": 53.3, "fat": 3.1, "fiber": 2.4}'::jsonb,
    15
  ),
  (
    'Grass-fed Ground Beef',
    'Premium grass-fed ground beef, 85% lean.',
    6.99,
    (SELECT id FROM categories WHERE name = 'Meat' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=2070&auto=format&fit=crop'],
    true,
    '500g',
    '{"calories": 217, "protein": 22, "carbohydrates": 0, "fat": 15, "iron": "12% DV"}'::jsonb,
    NULL
  ),
  (
    'Sparkling Water',
    'Refreshing sparkling water with natural flavors.',
    0.99,
    (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1598990386084-8af4dd16b3d3?q=80&w=1885&auto=format&fit=crop'],
    true,
    'bottle',
    '{"calories": 0, "protein": 0, "carbohydrates": 0, "fat": 0, "sodium": "2% DV"}'::jsonb,
    NULL
  ),
  (
    'Trail Mix',
    'Healthy mix of nuts, seeds, and dried fruits.',
    3.99,
    (SELECT id FROM categories WHERE name = 'Snacks' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1576076999914-c0f1d0b75c3a?q=80&w=2052&auto=format&fit=crop'],
    true,
    '200g',
    '{"calories": 607, "protein": 16, "carbohydrates": 45, "fat": 42, "fiber": 8}'::jsonb,
    20
  ),
  (
    'Frozen Mixed Berries',
    'Flash-frozen mixed berries, perfect for smoothies.',
    4.49,
    (SELECT id FROM categories WHERE name = 'Frozen Foods' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1563746924237-f4471435e650?q=80&w=1887&auto=format&fit=crop'],
    true,
    '500g',
    '{"calories": 42, "protein": 0.8, "carbohydrates": 10, "fat": 0.4, "fiber": 4}'::jsonb,
    NULL
  ),
  (
    'Organic Avocado',
    'Ripe and ready organic avocados.',
    1.99,
    (SELECT id FROM categories WHERE name = 'Fruits' LIMIT 1),
    ARRAY['https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?q=80&w=1975&auto=format&fit=crop'],
    true,
    'each',
    '{"calories": 240, "protein": 3, "carbohydrates": 12, "fat": 22, "fiber": 10}'::jsonb,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Create demo admin user if one doesn't exist
DO $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Check if an admin user already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) INTO admin_exists;
  
  -- If no admin exists, create one with the specified details
  IF NOT admin_exists THEN
    INSERT INTO auth.users (id, email, email_confirmed_at, role)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      now(),
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      'Admin User',
      'admin'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Demo admin user created';
  ELSE
    RAISE NOTICE 'Admin user already exists, skipping creation';
  END IF;
END $$;

-- Create index for faster category name lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_categories_name'
  ) THEN
    CREATE INDEX idx_categories_name ON categories(name);
  END IF;
END $$; 