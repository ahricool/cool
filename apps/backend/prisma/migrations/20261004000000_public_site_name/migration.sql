-- Rename saved default branding while preserving custom site content.
UPDATE "site_settings" AS settings
SET "value" = jsonb_set(settings."value", '{translations}', (
  SELECT jsonb_agg(
    CASE
      WHEN settings."key" = 'site' AND translation->>'title' = 'Cool'
        THEN jsonb_set(translation, '{title}', '"梦桜"'::jsonb)
      WHEN settings."key" = 'homepage' AND translation->>'greeting' = 'Hi, Cool!'
        THEN jsonb_set(translation, '{greeting}', '"Hi, 梦桜!"'::jsonb)
      ELSE translation
    END ORDER BY position
  )
  FROM jsonb_array_elements(settings."value"->'translations')
    WITH ORDINALITY AS translations(translation, position)
)), "updated_at" = CURRENT_TIMESTAMP
WHERE settings."key" IN ('site', 'homepage')
  AND jsonb_typeof(settings."value"->'translations') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(settings."value"->'translations') AS translation
    WHERE (settings."key" = 'site' AND translation->>'title' = 'Cool')
       OR (settings."key" = 'homepage' AND translation->>'greeting' = 'Hi, Cool!')
  );
