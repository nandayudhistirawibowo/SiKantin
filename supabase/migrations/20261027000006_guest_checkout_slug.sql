BEGIN;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS slug text;

DO $$
DECLARE
    tenant RECORD;
    base_slug text;
    candidate_slug text;
    suffix_number integer;
BEGIN
    FOR tenant IN
        SELECT id, nama_tenant
        FROM public.tenants
        WHERE slug IS NULL OR btrim(slug) = ''
        ORDER BY id
    LOOP
        base_slug := trim(both '-' FROM regexp_replace(lower(coalesce(tenant.nama_tenant, '')), '[^a-z0-9]+', '-', 'g'));
        IF base_slug = '' THEN
            base_slug := 'kantin';
        END IF;
        candidate_slug := left(base_slug, 100);
        suffix_number := 1;
        WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = candidate_slug) LOOP
            candidate_slug := left(base_slug, 90) || '-' || suffix_number::text;
            suffix_number := suffix_number + 1;
        END LOOP;
        UPDATE public.tenants
        SET slug = candidate_slug
        WHERE id = tenant.id;
    END LOOP;
END;
$$;

ALTER TABLE public.tenants
    ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique
    ON public.tenants (slug);

CREATE OR REPLACE FUNCTION public.set_tenant_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    base_slug text;
    candidate_slug text;
    suffix_number integer := 1;
BEGIN
    base_slug := trim(both '-' FROM regexp_replace(lower(coalesce(NEW.nama_tenant, '')), '[^a-z0-9]+', '-', 'g'));
    IF base_slug = '' THEN
        base_slug := 'kantin';
    END IF;
    candidate_slug := left(base_slug, 100);

    WHILE EXISTS (
        SELECT 1
        FROM public.tenants AS tenant
        WHERE tenant.slug = candidate_slug
          AND tenant.id IS DISTINCT FROM NEW.id
    ) LOOP
        candidate_slug := left(base_slug, 90) || '-' || suffix_number::text;
        suffix_number := suffix_number + 1;
    END LOOP;

    NEW.slug := candidate_slug;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_set_slug ON public.tenants;
CREATE TRIGGER tenants_set_slug
    BEFORE INSERT OR UPDATE OF nama_tenant ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_slug();

ALTER TABLE public.orders
    ALTER COLUMN mahasiswa_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS token_pesanan text,
    ADD COLUMN IF NOT EXISTS nim_guest text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_token_pesanan_unique
    ON public.orders (token_pesanan);

DROP POLICY IF EXISTS tenants_select_guest ON public.tenants;
CREATE POLICY tenants_select_guest
    ON public.tenants
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS menu_items_select_guest ON public.menu_items;
CREATE POLICY menu_items_select_guest
    ON public.menu_items
    FOR SELECT
    TO anon
    USING (
        tersedia = true
        AND EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = menu_items.tenant_id
        )
    );

GRANT SELECT ON TABLE public.tenants TO anon;
GRANT SELECT ON TABLE public.menu_items TO anon;

CREATE OR REPLACE FUNCTION public.broadcast_guest_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.token_pesanan IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM realtime.send(
            jsonb_build_object(
                'token_pesanan', NEW.token_pesanan,
                'status', NEW.status,
                'updated_at', NEW.updated_at
            ),
            'order_status',
            'guest-order:' || NEW.token_pesanan,
            false
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guest_order_status_broadcast ON public.orders;
CREATE TRIGGER guest_order_status_broadcast
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.broadcast_guest_order_status();

COMMIT;
