BEGIN;

DROP POLICY IF EXISTS orders_update_tenant_owner ON public.orders;

CREATE POLICY orders_update_tenant_owner
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (
        orders.tenant_id IS NOT NULL
        AND auth.uid() = (
            SELECT tenant.pemilik_id
            FROM public.tenants AS tenant
            WHERE tenant.id = orders.tenant_id
        )
    )
    WITH CHECK (
        orders.tenant_id IS NOT NULL
        AND auth.uid() = (
            SELECT tenant.pemilik_id
            FROM public.tenants AS tenant
            WHERE tenant.id = orders.tenant_id
        )
    );

COMMIT;
