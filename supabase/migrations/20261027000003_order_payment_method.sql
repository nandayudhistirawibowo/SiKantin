ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS metode_pembayaran text NOT NULL DEFAULT 'qris';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_metode_pembayaran_check'
            AND conrelid = 'public.orders'::regclass
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_metode_pembayaran_check
            CHECK (metode_pembayaran IN ('qris', 'tunai'));
    END IF;
END;
$$;
