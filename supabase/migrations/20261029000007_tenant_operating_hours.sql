BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS jam_buka time,
    ADD COLUMN IF NOT EXISTS jam_tutup time,
    ADD COLUMN IF NOT EXISTS override_until timestamptz;

WITH parsed_hours AS (
    SELECT
        tenant.id,
        regexp_match(
            replace(replace(tenant.jam_operasional, '–', '-'), '—', '-'),
            '^[[:space:]]*([0-9]{1,2})[.:]([0-9]{2})[[:space:]]*-[[:space:]]*([0-9]{1,2})[.:]([0-9]{2})[[:space:]]*$'
        ) AS parts
    FROM public.tenants AS tenant
    WHERE tenant.jam_operasional IS NOT NULL
      AND tenant.jam_buka IS NULL
      AND tenant.jam_tutup IS NULL
),
valid_hours AS (
    SELECT
        parsed_hours.id,
        make_time(parsed_hours.parts[1]::integer, parsed_hours.parts[2]::integer, 0) AS jam_buka,
        make_time(parsed_hours.parts[3]::integer, parsed_hours.parts[4]::integer, 0) AS jam_tutup
    FROM parsed_hours
    WHERE parsed_hours.parts IS NOT NULL
      AND parsed_hours.parts[1]::integer BETWEEN 0 AND 23
      AND parsed_hours.parts[2]::integer BETWEEN 0 AND 59
      AND parsed_hours.parts[3]::integer BETWEEN 0 AND 23
      AND parsed_hours.parts[4]::integer BETWEEN 0 AND 59
      AND (
          parsed_hours.parts[1]::integer * 60 + parsed_hours.parts[2]::integer
          <> parsed_hours.parts[3]::integer * 60 + parsed_hours.parts[4]::integer
      )
)
UPDATE public.tenants AS tenant
SET jam_buka = valid_hours.jam_buka,
    jam_tutup = valid_hours.jam_tutup
FROM valid_hours
WHERE tenant.id = valid_hours.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_operating_hours_pair'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_operating_hours_pair
            CHECK ((jam_buka IS NULL) = (jam_tutup IS NULL));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_operating_hours_distinct'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_operating_hours_distinct
            CHECK (jam_buka IS NULL OR jam_buka <> jam_tutup);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_tenant_open_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now timestamptz := pg_catalog.now();
    v_local_time time := (pg_catalog.now() AT TIME ZONE 'Asia/Jakarta')::time;
BEGIN
    UPDATE public.tenants AS tenant
    SET status_buka = CASE
            WHEN tenant.jam_buka < tenant.jam_tutup THEN
                v_local_time >= tenant.jam_buka AND v_local_time < tenant.jam_tutup
            ELSE
                v_local_time >= tenant.jam_buka OR v_local_time < tenant.jam_tutup
        END,
        override_until = NULL
    WHERE tenant.jam_buka IS NOT NULL
      AND tenant.jam_tutup IS NOT NULL
      AND (tenant.override_until IS NULL OR tenant.override_until <= v_now)
      AND (
          tenant.override_until IS NOT NULL
          OR tenant.status_buka IS DISTINCT FROM CASE
              WHEN tenant.jam_buka < tenant.jam_tutup THEN
                  v_local_time >= tenant.jam_buka AND v_local_time < tenant.jam_tutup
              ELSE
                  v_local_time >= tenant.jam_buka OR v_local_time < tenant.jam_tutup
          END
      );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_tenant_open_status() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_tenant_manual_status(
    p_tenant_id uuid,
    p_status_buka boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_tenant public.tenants%ROWTYPE;
    v_now timestamptz := pg_catalog.now();
    v_local_now timestamp without time zone;
    v_next_open timestamp without time zone;
    v_next_close timestamp without time zone;
    v_override_until timestamptz;
BEGIN
    IF auth.uid() IS NULL OR p_status_buka IS NULL THEN
        RAISE EXCEPTION 'Sesi tenant atau status manual tidak valid.';
    END IF;

    SELECT tenant.*
    INTO v_tenant
    FROM public.tenants AS tenant
    WHERE tenant.id = p_tenant_id
      AND tenant.pemilik_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant tidak ditemukan atau bukan milik akun ini.';
    END IF;

    IF v_tenant.jam_buka IS NOT NULL AND v_tenant.jam_tutup IS NOT NULL THEN
        v_local_now := v_now AT TIME ZONE 'Asia/Jakarta';
        v_next_open := v_local_now::date + v_tenant.jam_buka;
        v_next_close := v_local_now::date + v_tenant.jam_tutup;

        IF v_next_open <= v_local_now THEN
            v_next_open := v_next_open + interval '1 day';
        END IF;
        IF v_next_close <= v_local_now THEN
            v_next_close := v_next_close + interval '1 day';
        END IF;

        v_override_until := (
            CASE
                WHEN v_next_open < v_next_close THEN v_next_open
                ELSE v_next_close
            END
        ) AT TIME ZONE 'Asia/Jakarta';
    END IF;

    UPDATE public.tenants
    SET status_buka = p_status_buka,
        override_until = v_override_until
    WHERE id = p_tenant_id;

    RETURN pg_catalog.jsonb_build_object(
        'status_buka', p_status_buka,
        'override_until', v_override_until
    );
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_manual_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tenant_manual_status(uuid, boolean) TO authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-tenant-open-status';

SELECT cron.schedule(
    'refresh-tenant-open-status',
    '* * * * *',
    'SELECT public.refresh_tenant_open_status();'
);

SELECT public.refresh_tenant_open_status();

COMMIT;
