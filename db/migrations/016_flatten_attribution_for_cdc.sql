-- Expand stable Attributor payloads into physical columns for warehouse/CDC use.
-- The JSONB snapshots remain during the expand-and-contract period so existing
-- webhook functions and deployed application versions continue to work.

DO $migration$
DECLARE
  attribution_key text;
  column_prefix text;
BEGIN
  FOREACH column_prefix IN ARRAY ARRAY['first_', 'last_'] LOOP
    FOREACH attribution_key IN ARRAY ARRAY[
      'source', 'medium', 'campaign', 'term', 'content', 'id',
      'source_platform', 'marketing_tactic', 'creative_format',
      'adextension', 'adgroup', 'adgroupid', 'adplacement', 'adposition',
      'campaignid', 'geo', 'keymatch', 'device', 'matchtype', 'network'
    ] LOOP
      EXECUTE format(
        'ALTER TABLE rancher.submission_attribution ADD COLUMN IF NOT EXISTS %I text',
        column_prefix || attribution_key
      );
    END LOOP;
  END LOOP;

  FOREACH column_prefix IN ARRAY ARRAY[
    'first_', 'last_', 'partnership_first_', 'partnership_last_'
  ] LOOP
    FOREACH attribution_key IN ARRAY ARRAY[
      'source', 'medium', 'campaign', 'term', 'content', 'id',
      'source_platform', 'marketing_tactic', 'creative_format',
      'adextension', 'adgroup', 'adgroupid', 'adplacement', 'adposition',
      'campaignid', 'geo', 'keymatch', 'device', 'matchtype', 'network'
    ] LOOP
      EXECUTE format(
        'ALTER TABLE rancher.user_attribution ADD COLUMN IF NOT EXISTS %I text',
        column_prefix || attribution_key
      );
    END LOOP;
  END LOOP;
END
$migration$;

CREATE OR REPLACE FUNCTION rancher.sync_attribution_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $function$
DECLARE
  attribution_key text;
  column_prefix text;
  json_column text;
  touch jsonb;
  flattened jsonb := '{}'::jsonb;
BEGIN
  IF TG_TABLE_NAME = 'submission_attribution' THEN
    FOREACH column_prefix IN ARRAY ARRAY['first_', 'last_'] LOOP
      json_column := rtrim(column_prefix, '_') || '_touch';
      touch := COALESCE(to_jsonb(NEW) -> json_column, '{}'::jsonb);
      FOREACH attribution_key IN ARRAY ARRAY[
        'source', 'medium', 'campaign', 'term', 'content', 'id',
        'source_platform', 'marketing_tactic', 'creative_format',
        'adextension', 'adgroup', 'adgroupid', 'adplacement', 'adposition',
        'campaignid', 'geo', 'keymatch', 'device', 'matchtype', 'network'
      ] LOOP
        flattened := flattened || jsonb_build_object(
          column_prefix || attribution_key,
          NULLIF(btrim(touch ->> attribution_key), '')
        );
      END LOOP;
    END LOOP;
  ELSIF TG_TABLE_NAME = 'user_attribution' THEN
    FOREACH column_prefix IN ARRAY ARRAY[
      'first_', 'last_', 'partnership_first_', 'partnership_last_'
    ] LOOP
      json_column := rtrim(column_prefix, '_') || '_touch';
      touch := COALESCE(to_jsonb(NEW) -> json_column, '{}'::jsonb);
      FOREACH attribution_key IN ARRAY ARRAY[
        'source', 'medium', 'campaign', 'term', 'content', 'id',
        'source_platform', 'marketing_tactic', 'creative_format',
        'adextension', 'adgroup', 'adgroupid', 'adplacement', 'adposition',
        'campaignid', 'geo', 'keymatch', 'device', 'matchtype', 'network'
      ] LOOP
        flattened := flattened || jsonb_build_object(
          column_prefix || attribution_key,
          NULLIF(btrim(touch ->> attribution_key), '')
        );
      END LOOP;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Unsupported attribution table: %', TG_TABLE_NAME;
  END IF;

  NEW := jsonb_populate_record(NEW, flattened);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION rancher.sync_attribution_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_submission_attribution_columns
  ON rancher.submission_attribution;
CREATE TRIGGER sync_submission_attribution_columns
BEFORE INSERT OR UPDATE OF first_touch, last_touch
ON rancher.submission_attribution
FOR EACH ROW EXECUTE FUNCTION rancher.sync_attribution_columns();

DROP TRIGGER IF EXISTS sync_user_attribution_columns
  ON rancher.user_attribution;
CREATE TRIGGER sync_user_attribution_columns
BEFORE INSERT OR UPDATE OF first_touch, last_touch,
  partnership_first_touch, partnership_last_touch
ON rancher.user_attribution
FOR EACH ROW EXECUTE FUNCTION rancher.sync_attribution_columns();

-- Backfill existing rows through the same trigger used by future submissions.
UPDATE rancher.submission_attribution
SET first_touch = first_touch,
    last_touch = last_touch;

UPDATE rancher.user_attribution
SET first_touch = first_touch,
    last_touch = last_touch,
    partnership_first_touch = partnership_first_touch,
    partnership_last_touch = partnership_last_touch;

-- CDC uses the declared PostgreSQL primary keys as replica identity. Fail the
-- migration rather than leave either table silently incompatible.
DO $verification$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'rancher'
      AND relation.relname = 'submission_attribution'
      AND constraint_record.contype = 'p'
      AND pg_get_constraintdef(constraint_record.oid) = 'PRIMARY KEY (submission_id)'
  ) THEN
    RAISE EXCEPTION 'submission_attribution must have PRIMARY KEY (submission_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_record
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'rancher'
      AND relation.relname = 'user_attribution'
      AND constraint_record.contype = 'p'
      AND pg_get_constraintdef(constraint_record.oid) = 'PRIMARY KEY (email)'
  ) THEN
    RAISE EXCEPTION 'user_attribution must have PRIMARY KEY (email)';
  END IF;
END
$verification$;

ALTER TABLE rancher.submission_attribution REPLICA IDENTITY DEFAULT;
ALTER TABLE rancher.user_attribution REPLICA IDENTITY DEFAULT;

COMMENT ON TABLE rancher.submission_attribution IS
  'Immutable per-submission attribution snapshots with physical Attributor columns for CDC; JSONB retained for compatibility.';
COMMENT ON TABLE rancher.user_attribution IS
  'Email-keyed attribution state with physical Attributor columns for CDC; JSONB retained for compatibility.';
