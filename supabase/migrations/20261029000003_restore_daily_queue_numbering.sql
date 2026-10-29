BEGIN;

DROP TRIGGER IF EXISTS orders_release_queue_reservation ON public.orders;
DROP FUNCTION IF EXISTS public.release_tenant_queue_reservation();
DROP TABLE IF EXISTS public.tenant_queue_reservations;
DROP INDEX IF EXISTS public.orders_tenant_daily_queue_cycle_unique;

ALTER TABLE public.tenant_daily_order_counters
    DROP COLUMN IF EXISTS cycle_number;

ALTER TABLE public.orders
    DROP COLUMN IF EXISTS siklus_antrean;

INSERT INTO public.tenant_daily_order_counters (tenant_id, order_date, last_number)
SELECT
    orders.tenant_id,
    orders.tanggal_antrean,
    pg_catalog.max(pg_catalog.substr(orders.nomor_antrean, 3)::integer)
FROM public.orders
WHERE orders.tanggal_antrean IS NOT NULL
  AND orders.nomor_antrean ~ '^A-[0-9]{2,}$'
GROUP BY orders.tenant_id, orders.tanggal_antrean
ON CONFLICT (tenant_id, order_date)
DO UPDATE SET last_number = GREATEST(
    public.tenant_daily_order_counters.last_number,
    EXCLUDED.last_number
);

ALTER TABLE public.tenant_daily_order_counters
    DROP CONSTRAINT IF EXISTS tenant_daily_order_counters_last_number_check;

ALTER TABLE public.tenant_daily_order_counters
    ADD CONSTRAINT tenant_daily_order_counters_last_number_check
        CHECK (last_number > 0);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.orders
        WHERE tanggal_antrean IS NOT NULL
          AND nomor_antrean IS NOT NULL
        GROUP BY tenant_id, tanggal_antrean, nomor_antrean
        HAVING pg_catalog.count(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS orders_tenant_daily_queue_unique
            ON public.orders (tenant_id, tanggal_antrean, nomor_antrean)
            WHERE tanggal_antrean IS NOT NULL AND nomor_antrean IS NOT NULL;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_tenant_queue_number(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_date date := (pg_catalog.now() AT TIME ZONE 'Asia/Jakarta')::date;
    v_number integer;
BEGIN
    INSERT INTO public.tenant_daily_order_counters (tenant_id, order_date, last_number)
    VALUES (p_tenant_id, v_order_date, 1)
    ON CONFLICT (tenant_id, order_date)
    DO UPDATE SET last_number = public.tenant_daily_order_counters.last_number + 1
    RETURNING last_number INTO v_number;

    RETURN pg_catalog.jsonb_build_object(
        'nomor_antrean', 'A-' || pg_catalog.lpad(v_number::text, 2, '0'),
        'tanggal_antrean', v_order_date
    );
END;
$$;

REVOKE ALL ON FUNCTION public.next_tenant_queue_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_tenant_queue_number(uuid) TO service_role;

COMMIT;