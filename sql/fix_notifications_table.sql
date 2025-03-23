-- Function to create the notifications table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_notifications_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    -- Create the notifications table
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add indexes for faster querying
    CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
    CREATE INDEX notifications_read_idx ON public.notifications(read);
    CREATE INDEX notifications_created_at_idx ON public.notifications(created_at);
    
    -- Ensure non-admin users can only access their own notifications
    -- or notifications with null user_id (broadcast notifications)
    CREATE POLICY "Users can view their own notifications or broadcasts" 
      ON public.notifications
      FOR SELECT 
      USING (auth.uid() = user_id OR user_id IS NULL);
      
    -- Only admins can create notifications
    CREATE POLICY "Only admins can create notifications" 
      ON public.notifications
      FOR INSERT 
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    -- Users can update read status on their notifications
    CREATE POLICY "Users can update their own notifications read status" 
      ON public.notifications
      FOR UPDATE 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      
    -- Only admins can delete notifications
    CREATE POLICY "Only admins can delete notifications" 
      ON public.notifications
      FOR DELETE 
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
      
    -- Enable RLS on the notifications table
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$; 