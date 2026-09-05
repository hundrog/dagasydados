-- ============================================================================
-- restore telefono plaintext
--
-- The HMAC hashing migration (session_players_hash) made phone numbers
-- unrecoverable for the master. From now on we store BOTH:
--   * telefono       - plaintext, only readable by the session owner/admin (RLS)
--   * telefono_hash  - kept so duplicate detection within a session keeps working
--
-- The hashing secret and helper functions remain in place and are unused by the
-- new create_session_player(). Existing rows are left with telefono = NULL
-- because HMAC hashes cannot be reversed.
-- ============================================================================

-- 1. Restore the plaintext column (nullable; only future rows will have it).
ALTER TABLE "public"."session_players"
  ADD COLUMN IF NOT EXISTS "telefono" character varying(20);

CREATE INDEX IF NOT EXISTS "idx_session_players_telefono"
  ON "public"."session_players" USING btree ("telefono");

-- 2. create_session_player now stores the plaintext phone alongside the hash.
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
  v_count bigint;
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
    SELECT
      count("sp"."id") + COALESCE("gs"."anonymous_players", 0)
    INTO v_count
    FROM "public"."game_sessions" "gs"
    LEFT JOIN "public"."session_players" "sp"
      ON "sp"."game_session_id" = "gs"."id"
    WHERE "gs"."id" = p_game_session_id
    GROUP BY "gs"."anonymous_players";

    IF v_count >= v_max_players THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'full',
        'message', 'Esta sesión ya está llena'
      );
    END IF;
  END IF;

  v_hash := public.hash_telefono(v_telefono);

  BEGIN
    INSERT INTO "public"."session_players"
      ("game_session_id", "nombre", "telefono", "telefono_hash")
    VALUES (p_game_session_id, v_nombre, v_telefono, v_hash)
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