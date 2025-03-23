/*
  # Extended Features Schema
  
  This file contains additional features beyond the core schema:
  1. Offers and discounts system
  2. Shopping cart functionality 
  3. Order notification functions
  4. Update triggers for timestamps
*/

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

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cart_items
DO $$ BEGIN
  -- View policy (users can only view their own cart items)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Users can view own cart items'
  ) THEN
    CREATE POLICY "Users can view own cart items"
      ON cart_items FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Insert policy (users can only add items to their own cart)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Users can add items to own cart'
  ) THEN
    CREATE POLICY "Users can add items to own cart"
      ON cart_items FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Update policy (users can only update their own cart items)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Users can update own cart items'
  ) THEN
    CREATE POLICY "Users can update own cart items"
      ON cart_items FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Delete policy (users can only delete their own cart items)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Users can delete own cart items'
  ) THEN
    CREATE POLICY "Users can delete own cart items"
      ON cart_items FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create index for faster cart item lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Create function to handle order notifications
CREATE OR REPLACE FUNCTION handle_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification when order status changes
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> NEW.status)) THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Order ' || NEW.status,
      'Your order #' || substring(NEW.id::text, 1, 8) || ' is now ' || NEW.status,
      CASE
        WHEN NEW.status = 'delivered' THEN 'success'
        WHEN NEW.status = 'cancelled' THEN 'error'
        ELSE 'info'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to preserve notification read status
CREATE OR REPLACE FUNCTION preserve_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new notification (INSERT), do nothing
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- If this is an UPDATE and the notification was previously read
  -- but is now being set to unread, preserve the read status
  IF TG_OP = 'UPDATE' AND OLD.read = TRUE AND NEW.read = FALSE THEN
    NEW.read := TRUE;
    RAISE NOTICE 'Preserving read status for notification %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notification read status preservation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'preserve_notification_read_status_trigger'
  ) THEN
    CREATE TRIGGER preserve_notification_read_status_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION preserve_notification_read_status();
  END IF;
END $$;

-- Create function to check if demo notifications should be loaded
CREATE OR REPLACE FUNCTION should_load_demo_notifications()
RETURNS BOOLEAN AS $$
DECLARE
  demo_count INTEGER;
BEGIN
  -- Check if we already have notifications in the system
  SELECT COUNT(*) INTO demo_count FROM notifications 
  WHERE title = 'Welcome to Admin Dashboard';
  
  -- Only allow loading demo data when there are no notifications
  RETURN demo_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order notifications
CREATE OR REPLACE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_notification();

-- Create function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cart_items
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create trigger for products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 