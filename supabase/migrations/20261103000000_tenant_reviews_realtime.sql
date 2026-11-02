DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        EXECUTE 'CREATE PUBLICATION supabase_realtime';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'tenant_reviews'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_reviews';
    END IF;
END;
$$;

ALTER TABLE public.tenant_reviews REPLICA IDENTITY FULL;
