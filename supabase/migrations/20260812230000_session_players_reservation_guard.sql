CREATE OR REPLACE FUNCTION public.enforce_session_player_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_max_players integer;
  v_count integer;
BEGIN
  SELECT "max_players"
  INTO v_max_players
  FROM "public"."game_sessions"
  WHERE "id" = NEW."game_session_id"
  FOR UPDATE;

  IF v_max_players IS NOT NULL THEN
    SELECT count(*)
    INTO v_count
    FROM "public"."session_players"
    WHERE "game_session_id" = NEW."game_session_id";

    IF v_count >= v_max_players THEN
      RAISE EXCEPTION 'La sesión está llena'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW."nombre" := left(btrim(regexp_replace(COALESCE(NEW."nombre", ''), '[[:cntrl:]]', '', 'g')), 80);
  NEW."telefono" := left(btrim(COALESCE(NEW."telefono", '')), 20);

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_session_player_capacity() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trg_session_players_before_insert" ON "public"."session_players";

CREATE TRIGGER "trg_session_players_before_insert"
  BEFORE INSERT ON "public"."session_players"
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_session_player_capacity();
