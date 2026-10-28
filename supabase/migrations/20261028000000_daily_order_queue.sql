BEGIN;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS nomor_antrean text,
    ADD COLUMN IF NOT EXISTS tanggal_antrean date;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tenant_daily_queue_unique
    ON public.orders (tenant_id, tanggal_antrean, nomor_antrean)
    WHERE tanggal_antrean IS NOT NULL AND nomor_antrean IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tenant_daily_order_counters (
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_date date NOT NULL,
    last_number integer NOT NULL CHECK (last_number > 0),
    PRIMARY KEY (tenant_id, order_date)
);

ALTER TABLE public.tenant_daily_order_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_daily_order_counters FROM PUBLIC, anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.lookup_guest_order_with_queue(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order record;
    v_tenant_name text;
    v_items jsonb;
BEGIN
    IF p_token IS NULL
        OR p_token !~* '^SK-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$'
    THEN
        RETURN NULL;
    END IF;

    SELECT
        orders.id,
        orders.nomor_pesanan,
        orders.nomor_antrean,
        orders.token_pesanan,
        orders.status,
        orders.total,
        orders.created_at,
        tenants.nama_tenant
    INTO v_order
    FROM public.orders
    JOIN public.tenants ON tenants.id = orders.tenant_id
    WHERE orders.token_pesanan = pg_catalog.upper(pg_catalog.btrim(p_token));

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'nama_menu', order_items.nama_menu,
                'jumlah', order_items.jumlah,
                'subtotal', order_items.subtotal,
                'add_ons', order_items.add_ons
            )
            ORDER BY order_items.nama_menu
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM public.order_items
    WHERE order_items.order_id = v_order.id;

    RETURN pg_catalog.jsonb_build_object(
        'order',
        pg_catalog.jsonb_build_object(
            'token_pesanan', v_order.token_pesanan,
            'nomor_pesanan', v_order.nomor_pesanan,
            'nomor_antrean', v_order.nomor_antrean,
            'tenant_nama', v_order.nama_tenant,
            'tenants', pg_catalog.jsonb_build_object('nama_tenant', v_order.nama_tenant),
            'status', v_order.status,
            'total', v_order.total,
            'created_at', v_order.created_at,
            'items', v_items,
            'order_items', v_items
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_guest_order_with_queue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order_with_queue(text) TO anon, authenticated;

COMMIT;
