BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS no_telepon text,
    ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS public.favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT favorites_user_tenant_unique UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_created_idx
    ON public.favorites (user_id, created_at DESC);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
CREATE POLICY favorites_select_own
    ON public.favorites
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.peran = 'mahasiswa'
        )
    );

DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
CREATE POLICY favorites_insert_own
    ON public.favorites
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.peran = 'mahasiswa'
        )
    );

DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
CREATE POLICY favorites_delete_own
    ON public.favorites
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.peran = 'mahasiswa'
        )
    );

REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;

COMMIT;
