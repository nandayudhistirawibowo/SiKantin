BEGIN;

DROP INDEX IF EXISTS public.profiles_activation_code_unique;

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS activation_code;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;

COMMIT;
