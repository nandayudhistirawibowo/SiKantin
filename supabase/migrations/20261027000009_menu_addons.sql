BEGIN;

ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS add_ons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS add_ons jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'menu_items_add_ons_array'
          AND conrelid = 'public.menu_items'::regclass
    ) THEN
        ALTER TABLE public.menu_items
            ADD CONSTRAINT menu_items_add_ons_array
            CHECK (jsonb_typeof(add_ons) = 'array');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'order_items_add_ons_array'
          AND conrelid = 'public.order_items'::regclass
    ) THEN
        ALTER TABLE public.order_items
            ADD CONSTRAINT order_items_add_ons_array
            CHECK (jsonb_typeof(add_ons) = 'array');
    END IF;
END;
$$;

COMMIT;
