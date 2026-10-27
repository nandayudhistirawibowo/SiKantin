BEGIN;

-- Replace existing policies on these application tables to prevent permissive policies from widening access.
DO $$
DECLARE
    existing_policy RECORD;
BEGIN
    FOR existing_policy IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'tenants', 'menu_items', 'orders', 'order_items')
    LOOP
        EXECUTE format(
            'DROP POLICY %I ON %I.%I',
            existing_policy.policyname,
            existing_policy.schemaname,
            existing_policy.tablename
        );
    END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS profile
        WHERE profile.id = auth.uid()
          AND profile.peran = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Profile ID tidak dapat diubah';
    END IF;

    IF NEW.peran IS DISTINCT FROM OLD.peran
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Hanya admin yang dapat mengubah role';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_authenticated
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY profiles_insert_self_or_admin
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (id = auth.uid() AND peran = 'mahasiswa')
    );

CREATE POLICY profiles_update_self
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY tenants_select_authenticated
    ON public.tenants
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY tenants_update_owner
    ON public.tenants
    FOR UPDATE
    TO authenticated
    USING (pemilik_id = auth.uid())
    WITH CHECK (pemilik_id = auth.uid());

CREATE POLICY menu_items_select_authenticated
    ON public.menu_items
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY menu_items_insert_owner
    ON public.menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = menu_items.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    );

CREATE POLICY menu_items_update_owner
    ON public.menu_items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = menu_items.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = menu_items.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    );

CREATE POLICY menu_items_delete_owner
    ON public.menu_items
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = menu_items.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    );

CREATE POLICY orders_select_student_tenant_or_admin
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        mahasiswa_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = orders.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    );

CREATE POLICY orders_insert_student
    ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        mahasiswa_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.peran = 'mahasiswa'
        )
    );

CREATE POLICY orders_update_tenant_owner
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = orders.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenants AS tenant
            WHERE tenant.id = orders.tenant_id
              AND tenant.pemilik_id = auth.uid()
        )
    );

CREATE POLICY order_items_select_accessible_order
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.orders AS parent_order
            WHERE parent_order.id = order_items.order_id
        )
    );

CREATE POLICY order_items_insert_student_own_order
    ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.peran = 'mahasiswa'
        )
        AND EXISTS (
            SELECT 1
            FROM public.orders AS parent_order
            WHERE parent_order.id = order_items.order_id
              AND parent_order.mahasiswa_id = auth.uid()
        )
    );

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.menu_items TO authenticated;
GRANT SELECT, INSERT ON TABLE public.orders TO authenticated;
REVOKE UPDATE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, alasan_pembatalan) ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT ON TABLE public.order_items TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS avatars_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_own_folder ON storage.objects;

CREATE POLICY avatars_public_read
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert_own_folder
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY avatars_update_own_folder
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY avatars_delete_own_folder
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

COMMIT;
