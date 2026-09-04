-- ============================================================================
-- session anonymous players
-- 1. Add an anonymous_players counter to game_sessions so a master can record
--    "walk-in" players without creating one row per person.
-- 2. Anonymous players count toward max_players (capacity) and are included in
--    the public session_player_count.
-- 3. Also fixes enforce_session_player_capacity(), which still referenced the
--    now-removed "telefono" column from the hashing migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Column on game_sessions (never negative).
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."game_sessions"
  ADD COLUMN IF NOT EXISTS "anonymous_players" integer NOT NULL DEFAULT 0
  CONSTRAINT "game_sessions_anonymous_players_check"
    CHECK ("anonymous_players" >= 0);

-- ---------------------------------------------------------------------------
-- 2. Public count function now includes anonymous players.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.session_player_count(p_session_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*)
     FROM "public"."session_players"
     WHERE "game_session_id" = p_session_id)
    + COALESCE(
        (SELECT "anonymous_players"
         FROM "public"."game_sessions"
         WHERE "id" = p_session_id),
        0
      );
$$;

REVOKE ALL ON FUNCTION public.session_player_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_player_count(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Create/reserve function now counts anonymous players toward capacity.
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
-- 4. Capacity trigger: sum anonymous players, and drop the stale "telefono"
--    reference left over from the hashing migration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_session_player_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_max_players integer;
  v_total bigint;
BEGIN
  SELECT "max_players", COALESCE("anonymous_players", 0)
  INTO v_max_players, v_total
  FROM "public"."game_sessions"
  WHERE "id" = NEW."game_session_id"
  FOR UPDATE;

  IF v_max_players IS NOT NULL THEN
    SELECT count(*) + v_total
    INTO v_total
    FROM "public"."session_players"
    WHERE "game_session_id" = NEW."game_session_id";

    IF v_total >= v_max_players THEN
      RAISE EXCEPTION 'La sesión está llena'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW."nombre" := left(btrim(regexp_replace(COALESCE(NEW."nombre", ''), '[[:cntrl:]]', '', 'g')), 80);

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_session_player_capacity() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_session_players_before_insert" ON "public"."session_players";

CREATE TRIGGER "trg_session_players_before_insert"
  BEFORE INSERT ON "public"."session_players"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_session_player_capacity();
