-- ============================================================================
-- PLY-1001: reservas ligadas a usuarios y altas manuales sin vínculo
-- ============================================================================

-- 1. Limpiar vínculos creados por el bug: un master quedó como jugador de su
-- propia sesión al agregar jugadores desde el panel de administración.
UPDATE public.session_players sp
SET user_id = NULL
FROM public.game_sessions gs
WHERE sp.game_session_id = gs.id
  AND sp.user_id = gs.master_id;

-- 2. Lógica compartida. No se expone por PostgREST: sólo la llaman los RPC.
CREATE OR REPLACE FUNCTION public.create_session_player_internal(
  p_game_session_id uuid,
  p_nombre text,
  p_telefono text,
  p_user_id uuid
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
  v_master_id uuid;
  v_constraint text;
BEGIN
  v_nombre := left(btrim(regexp_replace(COALESCE(p_nombre, ''), '[[:cntrl:]]', '', 'g')), 80);
  v_telefono := left(btrim(COALESCE(p_telefono, '')), 20);

  IF v_nombre = '' OR v_telefono = '' THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'invalid',
      'message', 'Nombre o teléfono inválidos'
    );
  END IF;

  SELECT "max_players", "master_id"
  INTO v_max_players, v_master_id
  FROM "public"."game_sessions"
  WHERE "id" = p_game_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'not_found',
      'message', 'Sesión no encontrada'
    );
  END IF;

  -- El master no puede inscribirse como jugador en su propia sesión.
  IF p_user_id IS NOT NULL AND v_master_id = p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'master_own_session',
      'message', 'El master no puede inscribirse en su propia sesión'
    );
  END IF;

  -- Además del índice único, damos un error claro al jugador ya inscrito.
  IF p_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM "public"."session_players"
    WHERE "game_session_id" = p_game_session_id
      AND "user_id" = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'already_registered',
      'message', 'Ya estás inscrito en esta sesión'
    );
  END IF;

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
      ("game_session_id", "nombre", "telefono", "telefono_hash", "user_id")
    VALUES (p_game_session_id, v_nombre, v_telefono, v_hash, p_user_id)
    RETURNING "id" INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

    IF v_constraint = 'session_players_session_user_uidx' THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'already_registered',
        'message', 'Ya estás inscrito en esta sesión'
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', false, 'error', 'duplicate',
      'message', 'Este teléfono ya está registrado para esta sesión'
    );
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

ALTER FUNCTION public.create_session_player_internal(uuid, text, text, uuid) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public.create_session_player_internal(uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_session_player_internal(uuid, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_session_player_internal(uuid, text, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_session_player_internal(uuid, text, text, uuid) FROM service_role;

-- 3. RPC público: reserva anónima o de un jugador autenticado.
CREATE OR REPLACE FUNCTION public.create_session_player(
  p_game_session_id uuid,
  p_nombre text,
  p_telefono text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.create_session_player_internal($1, $2, $3, auth.uid());
$$;

ALTER FUNCTION public.create_session_player(uuid, text, text) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO service_role;

-- 4. RPC de backoffice: el master/admin agrega jugadores manuales sin
-- vincularlos a su propia cuenta.
CREATE OR REPLACE FUNCTION public.create_session_player_manual(
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
  v_uid uuid;
  v_is_admin boolean;
  v_is_master boolean;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'forbidden',
      'message', 'No autorizado'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE id = v_uid
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1
    FROM public.game_sessions
    WHERE id = p_game_session_id
      AND master_id = v_uid
  ) INTO v_is_master;

  IF NOT (v_is_admin OR v_is_master) THEN
    RETURN jsonb_build_object(
      'ok', false, 'error', 'forbidden',
      'message', 'No autorizado'
    );
  END IF;

  RETURN public.create_session_player_internal(
    p_game_session_id,
    p_nombre,
    p_telefono,
    NULL
  );
END;
$$;

ALTER FUNCTION public.create_session_player_manual(uuid, text, text) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public.create_session_player_manual(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_session_player_manual(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_session_player_manual(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_player_manual(uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
