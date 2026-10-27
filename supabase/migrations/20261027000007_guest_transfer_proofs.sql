BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bukti-transfer',
    'bukti-transfer',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS bukti_transfer_public_read ON storage.objects;
CREATE POLICY bukti_transfer_public_read
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'bukti-transfer');

COMMIT;
