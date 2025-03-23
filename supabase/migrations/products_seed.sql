-- First add a unique constraint on the name column
ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);

-- Insert sample products for each category
INSERT INTO products (name, description, price, category_id, image_urls, unit, nutrition)
SELECT 
  p.name,
  p.description,
  p.price,
  c.id as category_id,
  p.image_urls,
  p.unit,
  p.nutrition
FROM (
  VALUES 
    -- Fruits
    ('Fresh Apples', 'Sweet and crispy red apples, perfect for snacking', 180.00, 'Fruits', ARRAY['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6'], 'kg', '{"calories": "52", "carbs": "14g", "fiber": "2.4g", "sugar": "10.4g"}'::jsonb),
    ('Organic Bananas', 'Naturally ripened yellow bananas', 60.00, 'Fruits', ARRAY['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e'], 'kg', '{"calories": "89", "carbs": "23g", "fiber": "2.6g", "sugar": "12.2g"}'::jsonb),
    
    -- Vegetables
    ('Fresh Tomatoes', 'Ripe, juicy tomatoes perfect for salads', 40.00, 'Vegetables', ARRAY['https://images.unsplash.com/photo-1546094096-0df4bcaaa337'], 'kg', '{"calories": "18", "carbs": "3.9g", "fiber": "1.2g", "sugar": "2.6g"}'::jsonb),
    ('Green Spinach', 'Fresh and crispy spinach leaves', 30.00, 'Vegetables', ARRAY['https://images.unsplash.com/photo-1576045057995-568f588f82fb'], '250g', '{"calories": "23", "carbs": "3.6g", "fiber": "2.2g", "protein": "2.9g"}'::jsonb),
    
    -- Dairy & Eggs
    ('Fresh Milk', 'Full-cream farm fresh milk', 62.00, 'Dairy & Eggs', ARRAY['https://images.unsplash.com/photo-1550583724-b2692b85b150'], 'L', '{"calories": "62", "protein": "3.4g", "fat": "3.6g", "calcium": "120mg"}'::jsonb),
    ('Farm Eggs', 'Farm fresh brown eggs', 90.00, 'Dairy & Eggs', ARRAY['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f'], 'dozen', '{"calories": "70", "protein": "6g", "fat": "5g", "cholesterol": "185mg"}'::jsonb),
    
    -- Meat & Poultry
    ('Chicken Breast', 'Boneless chicken breast, fresh cut', 280.00, 'Meat & Poultry', ARRAY['https://images.unsplash.com/photo-1604503468506-a8da13d82791'], 'kg', '{"calories": "165", "protein": "31g", "fat": "3.6g"}'::jsonb),
    ('Mutton', 'Fresh cut mutton pieces', 650.00, 'Meat & Poultry', ARRAY['https://images.unsplash.com/photo-1603048588665-791ca8f56d0c'], 'kg', '{"calories": "294", "protein": "25g", "fat": "21g"}'::jsonb),
    
    -- Fish & Seafood
    ('Fresh Salmon', 'Premium Atlantic salmon fillet', 800.00, 'Fish & Seafood', ARRAY['https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c'], 'kg', '{"calories": "208", "protein": "22g", "omega3": "2.3g"}'::jsonb),
    ('Prawns', 'Fresh cleaned medium-sized prawns', 450.00, 'Fish & Seafood', ARRAY['https://images.unsplash.com/photo-1565680018434-b513d5e5fd47'], '500g', '{"calories": "99", "protein": "19g", "fat": "1.3g"}'::jsonb),
    
    -- Rice & Grains
    ('Basmati Rice', 'Premium aged basmati rice', 160.00, 'Rice & Grains', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c'], 'kg', '{"calories": "130", "carbs": "28g", "protein": "2.7g"}'::jsonb),
    ('Quinoa', 'Organic white quinoa', 240.00, 'Rice & Grains', ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c'], '500g', '{"calories": "120", "carbs": "21g", "protein": "4.4g", "fiber": "2.8g"}'::jsonb),
    
    -- Pulses & Lentils
    ('Toor Dal', 'Premium yellow split pigeon peas', 140.00, 'Pulses & Lentils', ARRAY['https://images.unsplash.com/photo-1585996339626-a0cc9d4c3be4'], 'kg', '{"calories": "343", "protein": "22g", "fiber": "15g"}'::jsonb),
    ('Chickpeas', 'Organic dried chickpeas', 120.00, 'Pulses & Lentils', ARRAY['https://images.unsplash.com/photo-1515543904379-b0a0102e8dad'], 'kg', '{"calories": "364", "protein": "15g", "fiber": "17g"}'::jsonb),
    
    -- Cooking Oils
    ('Olive Oil', 'Extra virgin olive oil', 750.00, 'Cooking Oils', ARRAY['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5'], 'L', '{"calories": "120", "fat": "14g", "vitamin_e": "1.9mg"}'::jsonb),
    ('Sunflower Oil', 'Refined sunflower oil', 180.00, 'Cooking Oils', ARRAY['https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1'], 'L', '{"calories": "120", "fat": "14g", "vitamin_e": "5.6mg"}'::jsonb),
    
    -- Spices & Seasonings
    ('Turmeric Powder', 'Pure ground turmeric', 45.00, 'Spices & Seasonings', ARRAY['https://images.unsplash.com/photo-1615485500834-bc10199bc727'], '100g', '{"calories": "24", "iron": "1.8mg", "manganese": "1.9mg"}'::jsonb),
    ('Black Pepper', 'Freshly ground black pepper', 85.00, 'Spices & Seasonings', ARRAY['https://images.unsplash.com/photo-1596040033229-a9821ebd058d'], '100g', '{"calories": "251", "protein": "10g", "fiber": "25g"}'::jsonb),
    
    -- Snacks
    ('Potato Chips', 'Crispy salted potato chips', 40.00, 'Snacks', ARRAY['https://images.unsplash.com/photo-1599490659213-e2b9527bd087'], '100g', '{"calories": "536", "fat": "35g", "carbs": "53g"}'::jsonb),
    ('Mixed Nuts', 'Premium mixed nuts and dry fruits', 299.00, 'Snacks', ARRAY['https://images.unsplash.com/photo-1536591375667-f344781c3df5'], '250g', '{"calories": "607", "protein": "20g", "fat": "54g"}'::jsonb),
    
    -- Beverages
    ('Orange Juice', 'Fresh squeezed orange juice', 120.00, 'Beverages', ARRAY['https://images.unsplash.com/photo-1613478223719-2ab802602423'], 'L', '{"calories": "45", "sugar": "10g", "vitamin_c": "100%"}'::jsonb),
    ('Coconut Water', 'Natural tender coconut water', 60.00, 'Beverages', ARRAY['https://images.unsplash.com/photo-1581006852262-e4307cf6283a'], '500ml', '{"calories": "19", "potassium": "250mg", "magnesium": "60mg"}'::jsonb),
    
    -- Tea & Coffee
    ('Green Tea', 'Organic green tea bags', 180.00, 'Tea & Coffee', ARRAY['https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5'], '25 bags', '{"calories": "0", "antioxidants": "high", "caffeine": "28mg"}'::jsonb),
    ('Ground Coffee', 'Premium Arabica ground coffee', 299.00, 'Tea & Coffee', ARRAY['https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04'], '250g', '{"calories": "2", "caffeine": "95mg"}'::jsonb),
    
    -- Bread & Bakery
    ('Whole Wheat Bread', 'Fresh whole wheat bread', 45.00, 'Bread & Bakery', ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff'], '400g', '{"calories": "247", "protein": "8g", "fiber": "4g"}'::jsonb),
    ('Croissants', 'Butter croissants', 120.00, 'Bread & Bakery', ARRAY['https://images.unsplash.com/photo-1555507036-ab1f4038808a'], '4 pcs', '{"calories": "231", "fat": "12g", "carbs": "26g"}'::jsonb),
    
    -- Frozen Foods
    ('Frozen Peas', 'Garden fresh frozen peas', 80.00, 'Frozen Foods', ARRAY['https://images.unsplash.com/photo-1597464543523-492f95ee9183'], '500g', '{"calories": "81", "protein": "5g", "fiber": "5g"}'::jsonb),
    ('Ice Cream', 'Vanilla ice cream', 250.00, 'Frozen Foods', ARRAY['https://images.unsplash.com/photo-1497034825429-c343d7c6a68f'], '500ml', '{"calories": "207", "fat": "11g", "sugar": "21g"}'::jsonb),
    
    -- Ready to Eat
    ('Instant Noodles', 'Quick cook noodles', 15.00, 'Ready to Eat', ARRAY['https://images.unsplash.com/photo-1612929633738-8fe44f7ec841'], '75g', '{"calories": "320", "carbs": "48g", "protein": "7g"}'::jsonb),
    ('Canned Soup', 'Tomato soup', 85.00, 'Ready to Eat', ARRAY['https://images.unsplash.com/photo-1547592166-23ac45744acd'], '400g', '{"calories": "89", "protein": "2g", "fiber": "2g"}'::jsonb),
    
    -- Cleaning Supplies
    ('Dish Soap', 'Liquid dish washing soap', 99.00, 'Cleaning Supplies', ARRAY['https://images.unsplash.com/photo-1585421514738-01798e348b17'], '500ml', '{}'::jsonb),
    ('Laundry Detergent', 'Premium washing powder', 250.00, 'Cleaning Supplies', ARRAY['https://images.unsplash.com/photo-1610557892470-55d9e80c0bce'], 'kg', '{}'::jsonb),
    
    -- Personal Care
    ('Shampoo', 'Herbal shampoo', 180.00, 'Personal Care', ARRAY['https://images.unsplash.com/photo-1556228578-0d85b1a4d571'], '200ml', '{}'::jsonb),
    ('Toothpaste', 'Fluoride toothpaste', 85.00, 'Personal Care', ARRAY['https://images.unsplash.com/photo-1559667693-44d2bcaa6cc9'], '100g', '{}'::jsonb),
    
    -- Organic Foods
    ('Organic Honey', 'Pure organic honey', 450.00, 'Organic Foods', ARRAY['https://images.unsplash.com/photo-1587049352846-4a222e784d38'], '500g', '{"calories": "304", "carbs": "82g"}'::jsonb),
    ('Organic Chia Seeds', 'Raw organic chia seeds', 299.00, 'Organic Foods', ARRAY['https://images.unsplash.com/photo-1514733670139-4d87a1941d55'], '250g', '{"calories": "486", "protein": "17g", "omega3": "18g"}'::jsonb),
    
    -- Healthy & Diet
    ('Greek Yogurt', 'Low-fat Greek yogurt', 120.00, 'Healthy & Diet', ARRAY['https://images.unsplash.com/photo-1488477181946-6428a0291777'], '400g', '{"calories": "59", "protein": "10g", "calcium": "111mg"}'::jsonb),
    ('Protein Bar', 'Mixed nuts protein bar', 60.00, 'Healthy & Diet', ARRAY['https://images.unsplash.com/photo-1622484212850-eb596d769edc'], '40g', '{"calories": "180", "protein": "12g", "fiber": "4g"}'::jsonb),
    
    -- Baby Care
    ('Baby Wipes', 'Soft baby wipes', 150.00, 'Baby Care', ARRAY['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4'], '80 pcs', '{}'::jsonb),
    ('Baby Shampoo', 'Gentle baby shampoo', 180.00, 'Baby Care', ARRAY['https://images.unsplash.com/photo-1594736797933-d0501ba2fe65'], '200ml', '{}'::jsonb)
  ) as p(name, description, price, category_name, image_urls, unit, nutrition)
JOIN categories c ON c.name = p.category_name
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category_id = EXCLUDED.category_id,
  image_urls = EXCLUDED.image_urls,
  unit = EXCLUDED.unit,
  nutrition = EXCLUDED.nutrition;
