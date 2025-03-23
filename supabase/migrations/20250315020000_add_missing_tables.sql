-- Create payment_methods table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    last_four TEXT,
    expiry_date TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set RLS on payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_methods with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can view their own payment methods'
  ) THEN
    CREATE POLICY "Users can view their own payment methods"
      ON public.payment_methods
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_methods' 
    AND policyname = 'Users can manage their own payment methods'
  ) THEN
    CREATE POLICY "Users can manage their own payment methods"
      ON public.payment_methods
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can mark their own notifications as read'
  ) THEN
    CREATE POLICY "Users can mark their own notifications as read"
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON public.payment_methods (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (read);
CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON public.wishlists (user_id);
CREATE INDEX IF NOT EXISTS wishlists_product_id_idx ON public.wishlists (product_id);

-- Sample data for testing
INSERT INTO public.notifications (user_id, title, message, type, created_at)
SELECT 
    auth.uid(),
    'Welcome to Admin Dashboard',
    'Thank you for trying our admin dashboard. Explore the features and let us know what you think!',
    'info',
    now()
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (user_id, title, message, type, created_at)
SELECT 
    auth.uid(),
    'New Order Received',
    'You have received a new order (#12345). Click to view details.',
    'success',
    now() - interval '2 hours'
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (user_id, title, message, type, created_at)
SELECT 
    auth.uid(),
    'Low Stock Alert',
    'Product "Premium Headphones" is running low on stock (2 remaining).',
    'warning',
    now() - interval '1 day'
FROM auth.users
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create function to preserve read status when notifications are refreshed
-- This ensures that once a notification is marked as read, it stays read
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

-- Create trigger to preserve read status with existence check
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'preserve_notification_read_status_trigger'
  ) THEN
    CREATE TRIGGER preserve_notification_read_status_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION preserve_notification_read_status();
  END IF;
END $$;

-- Create function to prevent reinserting demo notifications if they were deleted
CREATE OR REPLACE FUNCTION should_load_demo_notifications()
RETURNS BOOLEAN AS $$
DECLARE
  demo_count INTEGER;
BEGIN
  -- Check if we already have notifications in the system
  SELECT COUNT(*) INTO demo_count FROM public.notifications 
  WHERE title = 'Welcome to Admin Dashboard';
  
  -- Only allow loading demo data when there are no notifications
  RETURN demo_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
