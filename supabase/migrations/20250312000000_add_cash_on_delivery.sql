-- Add is_cash_on_delivery field to orders table
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'is_cash_on_delivery'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE orders ADD COLUMN is_cash_on_delivery boolean NOT NULL DEFAULT false;
        RAISE NOTICE 'Added is_cash_on_delivery column to orders table';
    ELSE
        RAISE NOTICE 'is_cash_on_delivery column already exists in orders table';
    END IF;

    -- Make payment_method_id nullable
    BEGIN
        ALTER TABLE orders ALTER COLUMN payment_method_id DROP NOT NULL;
        RAISE NOTICE 'Made payment_method_id column nullable';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'payment_method_id column is already nullable or other error occurred: %', SQLERRM;
    END;
END $$; 