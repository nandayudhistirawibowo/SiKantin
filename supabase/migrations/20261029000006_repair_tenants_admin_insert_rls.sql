BEGIN;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_insert_admin ON public.tenants;
CREATE POLICY tenants_insert_admin
    ON public.tenants
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

GRANT INSERT ON TABLE public.tenants TO authenticated;

COMMIT;
