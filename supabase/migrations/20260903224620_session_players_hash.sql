-- ============================================================================
-- session_players: security hardening
-- 1. Stop storing player phone numbers in plaintext.
--    Replace with a deterministic HMAC-SHA256 hash using a secret in Vault.
-- 2. Tighten RLS: only the session owner (master) or an admin can read rows.
-- 3. Add a public, safe count function so UI counts keep working without
--    exposing any player data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. HMAC secret.
--
--    IMPORTANT: the HMAC secret does NOT live in this migration file. It is
--    stored in Supabase Vault and configured out-of-band to avoid committing a
--    secret to source control. Configure it BEFORE applying this migration:
--
--      supabase db execute --sql "SELECT vault.create_secret(
--        '<your-openssl-rand-hex-32-secret>',
--        'telefono_hmac_secret',
--        'Secreto HMAC para hashear el teléfono de session_players');"
--
--    If the secret does not exist yet when this migration runs, the finalize
--    step will warn and leave the plaintext "telefono" column intact. Set the
--    real secret (vault.create_secret) and re-run finalize_session_players_hash()
--    to complete the migration.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2. Helper to read the secret. SECURITY DEFINER as owner (postgres) so it can
--    read vault.decrypted_secrets, but execute is revoked from public roles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telefono_hmac_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "decrypted_secret"
  FROM "vault"."decrypted_secrets"
  WHERE "name" = 'telefono_hmac_secret';
$$;

REVOKE ALL ON FUNCTION public.telefono_hmac_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.telefono_hmac_secret() FROM anon;
REVOKE ALL ON FUNCTION public.telefono_hmac_secret() FROM authenticated;
REVOKE ALL ON FUNCTION public.telefono_hmac_secret() FROM service_role;
GRANT EXECUTE ON FUNCTION public.telefono_hmac_secret() TO postgres;

-- ---------------------------------------------------------------------------
-- 3. Deterministic HMAC-SHA256 hashing function (returns hex).
--    SECURITY DEFINER so it can reach the Vault secret via the helper.
--    Raises a clear error if the secret is unset or still a placeholder.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_telefono(p_telefono text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  v_secret := public.telefono_hmac_secret();

  IF v_secret IS NULL OR v_secret = '' OR v_secret = 'REPLACE_WITH_HMAC_SECRET' THEN
    RAISE EXCEPTION 'HMAC secret (telefono_hmac_secret) no configurado'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN encode(extensions.hmac(p_telefono, v_secret, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public.hash_telefono(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hash_telefono(text) FROM anon;
REVOKE ALL ON FUNCTION public.hash_telefono(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.hash_telefono(text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.hash_telefono(text) TO postgres;

-- ---------------------------------------------------------------------------
-- 4. Public reservation/create function (SECURITY DEFINER).
--    Accepts the plaintext phone from the server, hashes it, and inserts ONLY
--    the hash. The plaintext is never persisted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_session_player(
  p_game_session_id uuid,
  p_nombre text,
  p_telefono text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_max_players integer;
  v_count integer;
  v_hash text;
  v_id uuid;
  v_nombre text;
  v_telefono text;
BEGIN
  v_nombre := left(btrim(regexp_replace(COALESCE(p_nombre, ''), '[[:cntrl:]]', '', 'g')), 80);
  v_telefono := left(btrim(COALESCE(p_telefono, '')), 20);

  IF v_nombre = '' OR v_telefono = '' THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'invalid',
      'message', 'Nombre o teléfono inválidos'
    );
  END IF;

  SELECT "max_players" INTO v_max_players
  FROM "public"."game_sessions"
  WHERE "id" = p_game_session_id
  FOR UPDATE;

  IF v_max_players IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM "public"."session_players"
    WHERE "game_session_id" = p_game_session_id;

    IF v_count >= v_max_players THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'full',
        'message', 'Esta sesión ya está llena'
      );
    END IF;
  END IF;

  v_hash := public.hash_telefono(v_telefono);

  BEGIN
    INSERT INTO "public"."session_players" ("game_session_id", "nombre", "telefono_hash")
    VALUES (p_game_session_id, v_nombre, v_hash)
    RETURNING "id" INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'duplicate',
      'message', 'Este teléfono ya está registrado para esta sesión'
    );
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Schema changes: add telefono_hash and migrate data.
--    The actual backfill + dropping of the plaintext column is wrapped in a
--    function (finalize) because it depends on the HMAC secret being set in
--    Vault. See step 1 of this migration.
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."session_players"
  ADD COLUMN IF NOT EXISTS "telefono_hash" text;

CREATE OR REPLACE FUNCTION public.finalize_session_players_hash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT "decrypted_secret" INTO v_secret
  FROM "vault"."decrypted_secrets"
  WHERE "name" = 'telefono_hmac_secret';

  IF v_secret IS NULL OR v_secret = '' OR v_secret = 'REPLACE_WITH_HMAC_SECRET' THEN
    RAISE NOTICE 'HMAC secret no configurado; se dejo la columna "telefono" intacta. Configura vault.create_secret(''<secret>'',''telefono_hmac_secret'','''') y llama a finalize_session_players_hash() para completar la migracion.';
    RETURN;
  END IF;

  -- Backfill the hash for all existing rows (telefono still present).
  UPDATE "public"."session_players"
  SET "telefono_hash" = public.hash_telefono("telefono")
  WHERE "telefono_hash" IS NULL OR "telefono_hash" = '';

  -- Drop plaintext-based unique constraint and index.
  ALTER TABLE "public"."session_players"
    DROP CONSTRAINT IF EXISTS "session_players_game_session_id_telefono_key";
  DROP INDEX IF EXISTS "public"."idx_session_players_telefono";

  -- Enforce uniqueness on the hash (keeps duplicate-phone-per-session intact).
  ALTER TABLE "public"."session_players"
    ADD CONSTRAINT "session_players_game_session_id_telefono_hash_key"
    UNIQUE ("game_session_id", "telefono_hash");

  CREATE INDEX IF NOT EXISTS "idx_session_players_telefono_hash"
    ON "public"."session_players" USING btree ("telefono_hash");

  ALTER TABLE "public"."session_players"
    ALTER COLUMN "telefono_hash" SET NOT NULL;

  -- Remove the plaintext column entirely. The plaintext is no longer stored.
  ALTER TABLE "public"."session_players"
    DROP COLUMN IF EXISTS "telefono";
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_session_players_hash() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_session_players_hash() FROM anon;
REVOKE ALL ON FUNCTION public.finalize_session_players_hash() FROM authenticated;
REVOKE ALL ON FUNCTION public.finalize_session_players_hash() FROM service_role;
GRANT EXECUTE ON FUNCTION public.finalize_session_players_hash() TO postgres;

SELECT public.finalize_session_players_hash();

-- ---------------------------------------------------------------------------
-- 6. Public, safe count function (returns an integer only, never rows).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_player_count(p_session_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)
  FROM "public"."session_players"
  WHERE "game_session_id" = p_session_id;
$$;

REVOKE ALL ON FUNCTION public.session_player_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 7. RLS: restrict reading session_players to session owner (master) or admin.
--    Insert stays publicly allowed (self-reservation). UPDATE/DELETE already
--    restricted to owner/admin by rls_hardening migration.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura pública session_players" ON "public"."session_players";

DROP POLICY IF EXISTS "Leer session_players owner o admin" ON "public"."session_players";

CREATE POLICY "Leer session_players owner o admin" ON "public"."session_players"
  FOR SELECT TO "authenticated"
  USING (
    ("auth"."uid"() IN (SELECT "id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "session_players"."game_session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );
