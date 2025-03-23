-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings table
CREATE POLICY "Allow authenticated users to view settings" 
    ON public.settings
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to modify settings" 
    ON public.settings
    FOR ALL 
    TO authenticated
    USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Add comments
COMMENT ON TABLE public.settings IS 'Stores application settings';
COMMENT ON COLUMN public.settings.settings_data IS 'JSON object containing all application settings';

-- Insert default settings
INSERT INTO public.settings (settings_data, created_at)
VALUES (
    '{
        "storeInfo": {
            "name": "Admin Dashboard Store",
            "email": "contact@example.com",
            "phone": "+1 (555) 123-4567",
            "website": "https://example.com",
            "address": "123 Commerce St, Suite 100, Cityville, State 12345",
            "description": "A premier online destination for quality products. We offer a wide selection of items to meet all your shopping needs."
        },
        "regionalSettings": {
            "currency": "usd",
            "timezone": "et"
        },
        "appearance": {
            "darkMode": false,
            "condensedView": false,
            "animations": true,
            "accentColor": "primary"
        },
        "notifications": {
            "newOrders": true,
            "orderUpdates": true,
            "lowStock": true,
            "customerReviews": false,
            "promotions": true,
            "security": true
        },
        "integrations": {
            "analyticsEnabled": true,
            "analyticsKey": "UA-XXXXXXXXX-X",
            "paymentsEnabled": true,
            "paymentsKey": "pk_test_XXXXXXXXXXXXXXXXXXXXXXXX",
            "socialEnabled": true,
            "socialAccounts": {
                "facebook": "https://facebook.com/adminstore",
                "twitter": "https://twitter.com/adminstore",
                "instagram": "https://instagram.com/adminstore",
                "linkedin": "https://linkedin.com/company/adminstore"
            }
        }
    }'::jsonb,
    now()
) ON CONFLICT DO NOTHING;
