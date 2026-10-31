BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS activation_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_activation_code_unique
    ON public.profiles (activation_code)
    WHERE activation_code IS NOT NULL;

REVOKE SELECT, INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, nama, nim, no_telepon, avatar_url, peran)
    ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, nama, nim, no_telepon, avatar_url, peran)
    ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nama, nim, no_telepon, avatar_url)
    ON TABLE public.profiles TO authenticated;
GRANT DELETE ON TABLE public.profiles TO authenticated;

COMMIT;
