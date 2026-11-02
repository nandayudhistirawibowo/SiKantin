BEGIN;

ALTER TABLE public.tenant_reviews
    ADD COLUMN IF NOT EXISTS feedback_text text;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.orders
SET completed_at = COALESCE(updated_at, created_at)
WHERE status = 'Selesai'
  AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_order_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'Selesai' AND OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.completed_at := pg_catalog.now();
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_completed_at() FROM PUBLIC;

DROP TRIGGER IF EXISTS orders_set_completed_at ON public.orders;
CREATE TRIGGER orders_set_completed_at
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_order_completed_at();

CREATE POLICY tenant_reviews_select_tenant_owner
    ON public.tenant_reviews
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders
            JOIN public.tenants ON tenants.id = orders.tenant_id
            WHERE orders.id = tenant_reviews.order_id
              AND tenants.pemilik_id = auth.uid()
        )
    );

GRANT SELECT ON TABLE public.tenant_reviews TO authenticated;

DROP FUNCTION IF EXISTS public.submit_guest_order_rating(text, integer);
CREATE FUNCTION public.submit_guest_order_rating(
    p_token text,
    p_rating integer,
    p_feedback_text text DEFAULT NULL
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
    v_feedback_text text;
BEGIN
    IF p_token IS NULL
       OR p_token !~* '^SK-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$' THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Token pesanan tidak valid.');
    END IF;

    IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Rating harus bernilai 1 sampai 5.');
    END IF;

    v_feedback_text := NULLIF(pg_catalog.btrim(p_feedback_text), '');
    IF v_feedback_text IS NOT NULL AND pg_catalog.char_length(v_feedback_text) > 1000 THEN
        RETURN pg_catalog.jsonb_build_object('error', 'Saran dan masukan maksimal 1000 karakter.');
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

    INSERT INTO public.tenant_reviews (order_id, tenant_id, rating, feedback_text)
    VALUES (v_order_id, v_tenant_id, p_rating, v_feedback_text)
    ON CONFLICT (order_id)
    DO UPDATE SET
        rating = EXCLUDED.rating,
        feedback_text = CASE
            WHEN p_feedback_text IS NULL THEN tenant_reviews.feedback_text
            ELSE EXCLUDED.feedback_text
        END,
        created_at = pg_catalog.now();

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'rating', p_rating,
        'feedback_text', v_feedback_text
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_order_rating(text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_order_rating(text, integer, text) TO anon, authenticated;

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
        orders.completed_at,
        tenants.nama_tenant,
        tenant_reviews.rating AS review_rating,
        tenant_reviews.feedback_text
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
            'completed_at', v_order.completed_at,
            'review_rating', v_order.review_rating,
            'feedback_text', v_order.feedback_text,
            'items', v_items,
            'order_items', v_items
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_guest_order_with_queue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_guest_order_with_queue(text) TO anon, authenticated;

COMMIT;
