BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_reviews (
    order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_reviews_tenant_idx
    ON public.tenant_reviews (tenant_id);

ALTER TABLE public.tenant_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_reviews FROM PUBLIC, anon, authenticated;

INSERT INTO public.tenant_reviews (order_id, tenant_id, rating, created_at)
SELECT
    review.order_id,
    orders.tenant_id,
    pg_catalog.round(pg_catalog.avg(review.rating)::numeric)::integer,
    pg_catalog.max(review.created_at)
FROM public.menu_reviews AS review
JOIN public.orders ON orders.id = review.order_id
GROUP BY review.order_id, orders.tenant_id
ON CONFLICT (order_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_tenant_ratings(p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'tenant_id', rating_stats.tenant_id,
                'rating_total', rating_stats.rating_total,
                'rating_average', pg_catalog.round(rating_stats.rating_total::numeric / rating_stats.review_count, 1),
                'review_count', rating_stats.review_count
            )
            ORDER BY rating_stats.tenant_id
        ),
        '[]'::jsonb
    )
    FROM (
        SELECT
            review.tenant_id,
            pg_catalog.sum(review.rating)::integer AS rating_total,
            pg_catalog.count(*)::integer AS review_count
        FROM public.tenant_reviews AS review
        WHERE p_tenant_id IS NULL OR review.tenant_id = p_tenant_id
        GROUP BY review.tenant_id
    ) AS rating_stats;
$$;

REVOKE ALL ON FUNCTION public.get_public_tenant_ratings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_ratings(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_guest_order_rating(
    p_token text,
    p_rating integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_id uuid;
    v_tenant_id uuid;
    v_status text;
BEGIN
    IF p_token IS NULL
       OR p_token !~* '^SK-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$' THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Token pesanan tidak valid.');
    END IF;

    IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Rating harus bernilai 1 sampai 5.');
    END IF;

    SELECT orders.id, orders.tenant_id, orders.status
    INTO v_order_id, v_tenant_id, v_status
    FROM public.orders
    WHERE orders.token_pesanan = pg_catalog.upper(pg_catalog.btrim(p_token))
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Pesanan tidak ditemukan.');
    END IF;

    IF v_status IS DISTINCT FROM 'Selesai' THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Rating hanya dapat diberikan setelah pesanan selesai.');
    END IF;

    INSERT INTO public.tenant_reviews (order_id, tenant_id, rating)
    VALUES (v_order_id, v_tenant_id, p_rating)
    ON CONFLICT (order_id)
    DO UPDATE SET
        rating = EXCLUDED.rating,
        created_at = pg_catalog.now();

    RETURN pg_catalog.jsonb_build_object('success', true, 'rating', p_rating);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_order_rating(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_order_rating(text, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_guest_order_with_queue(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order record;
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
        tenants.nama_tenant,
        tenant_reviews.rating AS review_rating
    INTO v_order
    FROM public.orders
    JOIN public.tenants ON tenants.id = orders.tenant_id
    LEFT JOIN public.tenant_reviews ON tenant_reviews.order_id = orders.id
    WHERE orders.token_pesanan = pg_catalog.upper(pg_catalog.btrim(p_token));

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'menu_item_id', order_items.menu_item_id,
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
            'id', v_order.id,
            'token_pesanan', v_order.token_pesanan,
            'nomor_pesanan', v_order.nomor_pesanan,
            'nomor_antrean', v_order.nomor_antrean,
            'tenant_nama', v_order.nama_tenant,
            'tenants', pg_catalog.jsonb_build_object('nama_tenant', v_order.nama_tenant),
            'status', v_order.status,
            'total', v_order.total,
            'created_at', v_order.created_at,
            'review_rating', v_order.review_rating,
            'items', v_items,
            'order_items', v_items
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_guest_order_with_queue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order_with_queue(text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.submit_guest_menu_rating(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_menu_ratings(uuid);

COMMIT;
