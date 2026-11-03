BEGIN;

DO $$
DECLARE
    existing_policy RECORD;
BEGIN
    FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'orders'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.orders',
            existing_policy.policyname
        );
    END LOOP;
END
$$;

CREATE POLICY orders_select_student_tenant_or_admin
    ON public.orders
    FOR SELECT
    TO authenticated
    USING (
        mahasiswa_id = auth.uid()
        OR public.is_admin()
        OR (
            orders.tenant_id IS NOT NULL
            AND auth.uid() = (
                SELECT tenant.pemilik_id
                FROM public.tenants AS tenant
                WHERE tenant.id = orders.tenant_id
            )
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

CREATE POLICY orders_update_tenant_owner_or_admin
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            orders.tenant_id IS NOT NULL
            AND auth.uid() = (
                SELECT tenant.pemilik_id
                FROM public.tenants AS tenant
                WHERE tenant.id = orders.tenant_id
            )
            AND EXISTS (
                SELECT 1
                FROM public.profiles AS profile
                WHERE profile.id = auth.uid()
                  AND profile.peran = 'pemilik_tenant'
            )
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            orders.tenant_id IS NOT NULL
            AND auth.uid() = (
                SELECT tenant.pemilik_id
                FROM public.tenants AS tenant
                WHERE tenant.id = orders.tenant_id
            )
            AND EXISTS (
                SELECT 1
                FROM public.profiles AS profile
                WHERE profile.id = auth.uid()
                  AND profile.peran = 'pemilik_tenant'
            )
        )
    );

COMMIT;
