-- ============================================================================
-- AUTH-1000: roles unificados (player/master) + cuentas de reserva ligadas
-- ============================================================================

-- 1. Rol derivado de status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'profile_role'
  ) THEN
    CREATE TYPE public.profile_role AS ENUM ('player', 'master');
  END IF;
END
$$;

ALTER TABLE public.dagger_masters
  ADD COLUMN IF NOT EXISTS role public.profile_role
  GENERATED ALWAYS AS (
    CASE
      WHEN status = 'authorized' THEN 'master'::public.profile_role
      ELSE 'player'::public.profile_role
    END
  ) STORED;

COMMENT ON COLUMN public.dagger_masters.role
  IS 'Rol derivado (GENERATED) de status: authorized -> master; resto -> player.';

-- 2. Backfill seguro de admins y masters con sesiones
UPDATE public.dagger_masters dm
SET status = 'authorized'
WHERE EXISTS (
  SELECT 1 FROM public.admins a WHERE a.id = dm.id
)
AND dm.status IS DISTINCT FROM 'authorized';

UPDATE public.dagger_masters dm
SET status = 'authorized'
WHERE EXISTS (
  SELECT 1 FROM public.game_sessions gs WHERE gs.master_id = dm.id
)
AND dm.status IS DISTINCT FROM 'authorized';

-- 3. Promoción automática de perfiles administradores
CREATE OR REPLACE FUNCTION public.promote_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.dagger_masters
  SET status = 'authorized'
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.promote_admin_profile() OWNER TO "postgres";

DROP TRIGGER IF EXISTS trg_admins_promote_profile ON public.admins;
CREATE TRIGGER trg_admins_promote_profile
AFTER INSERT ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.promote_admin_profile();

-- 4. handle_new_user: sólo identidad, status default 'created' => player
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.dagger_masters (
    id,
    full_name,
    user_name,
    avatar_url,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'name',
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO "postgres";

-- 5. RLS dagger_masters (mantener políticas existentes ya ajustadas; sólo asegurar grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dagger_masters TO "authenticated";
GRANT SELECT ON public.dagger_masters TO "anon";

-- 6. session_players.user_id + índice parcial + FK auth.users
ALTER TABLE public.session_players
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_players_user_id
  ON public.session_players (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS session_players_session_user_uidx
  ON public.session_players (game_session_id, user_id)
  WHERE user_id IS NOT NULL;

-- 7. create_session_player derivando user_id de auth.uid
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
      ("game_session_id", "nombre", "telefono", "telefono_hash", "user_id")
    VALUES (p_game_session_id, v_nombre, v_telefono, v_hash, auth.uid())
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

ALTER FUNCTION public.create_session_player(uuid, text, text) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_session_player(uuid, text, text) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session_player(uuid, text, text) TO service_role;

-- 8. RLS session_players endurecida
DROP POLICY IF EXISTS "Lectura pública session_players" ON public.session_players;
DROP POLICY IF EXISTS "Crear session_players público" ON public.session_players;
DROP POLICY IF EXISTS "Editar session_players autenticado" ON public.session_players;
DROP POLICY IF EXISTS "Borrar session_players autenticado" ON public.session_players;

CREATE POLICY "Leer reservas admin/master/owner" ON public.session_players
  FOR SELECT TO "authenticated"
  USING (
    (auth.uid() IN (SELECT id FROM public.admins))
    OR EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = game_session_id
        AND gs.master_id = auth.uid()
    )
    OR (user_id = auth.uid())
  );

CREATE POLICY "Editar reservas admin/master" ON public.session_players
  FOR UPDATE TO "authenticated"
  USING (
    (auth.uid() IN (SELECT id FROM public.admins))
    OR EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = game_session_id
        AND gs.master_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.uid() IN (SELECT id FROM public.admins))
    OR EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = game_session_id
        AND gs.master_id = auth.uid()
    )
  );

CREATE POLICY "Borrar reservas admin/master" ON public.session_players
  FOR DELETE TO "authenticated"
  USING (
    (auth.uid() IN (SELECT id FROM public.admins))
    OR EXISTS (
      SELECT 1
      FROM public.game_sessions gs
      WHERE gs.id = game_session_id
        AND gs.master_id = auth.uid()
    )
  );

-- anon no tiene acceso directo a session_players; la reserva pública pasa por RPC.

NOTIFY pgrst, 'reload schema';
