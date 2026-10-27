BEGIN;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS jam_operasional text,
    ADD COLUMN IF NOT EXISTS no_telepon text;

ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS waktu_persiapan integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS tenants_insert_admin ON public.tenants;
CREATE POLICY tenants_insert_admin
    ON public.tenants
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tenants_update_admin ON public.tenants;
CREATE POLICY tenants_update_admin
    ON public.tenants
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS tenants_delete_admin ON public.tenants;
CREATE POLICY tenants_delete_admin
    ON public.tenants
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS menu_items_insert_admin ON public.menu_items;
CREATE POLICY menu_items_insert_admin
    ON public.menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS menu_items_update_admin ON public.menu_items;
CREATE POLICY menu_items_update_admin
    ON public.menu_items
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS menu_items_delete_admin ON public.menu_items;
CREATE POLICY menu_items_delete_admin
    ON public.menu_items
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.menu_items TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('qris-images', 'qris-images', true),
    ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS qris_images_public_read ON storage.objects;
CREATE POLICY qris_images_public_read
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'qris-images');

DROP POLICY IF EXISTS qris_images_admin_insert ON storage.objects;
CREATE POLICY qris_images_admin_insert
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'qris-images' AND public.is_admin());

DROP POLICY IF EXISTS qris_images_admin_update ON storage.objects;
CREATE POLICY qris_images_admin_update
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'qris-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'qris-images' AND public.is_admin());

DROP POLICY IF EXISTS qris_images_admin_delete ON storage.objects;
CREATE POLICY qris_images_admin_delete
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'qris-images' AND public.is_admin());

DROP POLICY IF EXISTS menu_images_public_read ON storage.objects;
CREATE POLICY menu_images_public_read
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS menu_images_admin_insert ON storage.objects;
CREATE POLICY menu_images_admin_insert
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());

DROP POLICY IF EXISTS menu_images_admin_update ON storage.objects;
CREATE POLICY menu_images_admin_update
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'menu-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());

DROP POLICY IF EXISTS menu_images_admin_delete ON storage.objects;
CREATE POLICY menu_images_admin_delete
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'menu-images' AND public.is_admin());

COMMIT;
