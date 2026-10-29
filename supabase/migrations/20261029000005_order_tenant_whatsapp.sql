BEGIN;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS tenant_whatsapp text NOT NULL DEFAULT 'not_applicable';

COMMIT;
