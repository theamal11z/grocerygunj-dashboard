-- First add a unique constraint on the name column
ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);

-- Then insert the categories
INSERT INTO categories (name, image_url)
VALUES 
  -- Fresh Produce
  ('Fruits', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf'),
  ('Vegetables', 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c'),
  
  -- Dairy & Eggs
  ('Dairy & Eggs', 'https://images.unsplash.com/photo-1550583724-b2692b85b150'),
  
  -- Meat & Seafood
  ('Meat & Poultry', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f'),
  ('Fish & Seafood', 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9'),
  
  -- Pantry Essentials
  ('Rice & Grains', 'https://images.unsplash.com/photo-1586201375761-83865001e31c'),
  ('Pulses & Lentils', 'https://images.unsplash.com/photo-1515543904379-b0a0102e8dad'),
  ('Cooking Oils', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5'),
  ('Spices & Seasonings', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d'),
  
  -- Snacks & Beverages
  ('Snacks', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087'),
  ('Beverages', 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a'),
  ('Tea & Coffee', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04'),
  
  -- Bakery
  ('Bread & Bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff'),
  
  -- Frozen & Ready-to-eat
  ('Frozen Foods', 'https://images.unsplash.com/photo-1597464543523-492f95ee9183'),
  ('Ready to Eat', 'https://images.unsplash.com/photo-1559847844-5315695dadae'),
  
  -- Household
  ('Cleaning Supplies', 'https://images.unsplash.com/photo-1585421514738-01798e348b17'),
  ('Personal Care', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571'),
  
  -- Special Categories
  ('Organic Foods', 'https://images.unsplash.com/photo-1490885578174-acda8905c2c6'),
  ('Healthy & Diet', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061'),
  ('Baby Care', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4')
ON CONFLICT (name) DO UPDATE 
SET image_url = EXCLUDED.image_url;

-- Create index for faster category searches if not exists
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name); 