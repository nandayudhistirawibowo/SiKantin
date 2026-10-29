BEGIN;

CREATE TABLE IF NOT EXISTS public.menu_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS menu_reviews_menu_item_idx
    ON public.menu_reviews (menu_item_id);

ALTER TABLE public.menu_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.menu_reviews FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_menu_ratings(p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
                'menu_item_id', rating_stats.menu_item_id,
                'tenant_id', rating_stats.tenant_id,
                'rating_total', rating_stats.rating_total,
                'rating_average', pg_catalog.round(rating_stats.rating_total::numeric / rating_stats.review_count, 1),
                'review_count', rating_stats.review_count
            )
            ORDER BY rating_stats.menu_item_id
        ),
        '[]'::jsonb
    )
    FROM (
        SELECT
            menu.id AS menu_item_id,
            menu.tenant_id,
            pg_catalog.sum(review.rating)::integer AS rating_total,
            pg_catalog.count(*)::integer AS review_count
        FROM public.menu_items AS menu
        JOIN public.menu_reviews AS review ON review.menu_item_id = menu.id
        WHERE menu.tersedia = true
          AND (p_tenant_id IS NULL OR menu.tenant_id = p_tenant_id)
        GROUP BY menu.id, menu.tenant_id
    ) AS rating_stats;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_ratings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_ratings(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_guest_menu_rating(
    p_token text,
    p_menu_item_id uuid,
    p_rating integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_id uuid;
    v_status text;
BEGIN
    IF p_token IS NULL
       OR p_token !~* '^SK-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$' THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Token pesanan tidak valid.');
    END IF;

    IF p_menu_item_id IS NULL OR p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Menu atau rating tidak valid.');
    END IF;

    SELECT orders.id, orders.status
    INTO v_order_id, v_status
    FROM public.orders
    WHERE orders.token_pesanan = pg_catalog.upper(pg_catalog.btrim(p_token))
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Pesanan tidak ditemukan.');
    END IF;

    IF v_status IS DISTINCT FROM 'Selesai' THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Rating hanya dapat diberikan setelah pesanan selesai.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.order_items
        WHERE order_items.order_id = v_order_id
          AND order_items.menu_item_id = p_menu_item_id
    ) THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Menu tersebut tidak ada dalam pesanan.');
    END IF;

    INSERT INTO public.menu_reviews (order_id, menu_item_id, rating)
    VALUES (v_order_id, p_menu_item_id, p_rating)
    ON CONFLICT (order_id, menu_item_id)
    DO UPDATE SET
        rating = EXCLUDED.rating,
        created_at = pg_catalog.now();

    RETURN pg_catalog.jsonb_build_object('success', true, 'rating', p_rating);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_menu_rating(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_menu_rating(text, uuid, integer) TO anon, authenticated;

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
                'menu_item_id', order_items.menu_item_id,
                'nama_menu', order_items.nama_menu,
                'jumlah', order_items.jumlah,
                'subtotal', order_items.subtotal,
                'add_ons', order_items.add_ons,
                'review_rating', menu_reviews.rating
            )
            ORDER BY order_items.nama_menu
        ),
        '[]'::jsonb
    )
    INTO v_items
    FROM public.order_items
    LEFT JOIN public.menu_reviews
      ON menu_reviews.order_id = order_items.order_id
     AND menu_reviews.menu_item_id = order_items.menu_item_id
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
