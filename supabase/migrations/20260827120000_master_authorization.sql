CREATE TYPE public.master_status AS ENUM (
  'created',
  'pending',
  'authorized'
);

ALTER TABLE public.dagger_masters
  ADD COLUMN IF NOT EXISTS status public.master_status NOT NULL DEFAULT 'created';

COMMENT ON COLUMN public.dagger_masters.status
  IS 'Estado de autorización del master: created (nuevo), pending (solicitada) o authorized (aprobado).';

-- Backfill: los masters existentes quedan autorizados
UPDATE public.dagger_masters
SET status = 'authorized'
WHERE status = 'created';

-- Solo admins pueden cambiar status directamente. Los owners solo pueden
-- solicitar autorización vía RPC (created -> pending).
CREATE OR REPLACE FUNCTION public.guard_master_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NOT (auth.uid() IN (SELECT "admins"."id" FROM "public"."admins")) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado del master'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_master_status_update() OWNER TO "postgres";

DROP TRIGGER IF EXISTS trg_master_status_guard ON public.dagger_masters;

CREATE TRIGGER trg_master_status_guard
  BEFORE UPDATE OF "status" ON public.dagger_masters
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_master_status_update();

-- RPC: el master solicita autorización (created -> pending)
CREATE OR REPLACE FUNCTION public.request_master_authorization()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE public.dagger_masters
  SET status = 'pending'
  WHERE id = auth.uid()
    AND status = 'created';
$$;

ALTER FUNCTION public.request_master_authorization() OWNER TO "postgres";

GRANT ALL ON FUNCTION public.request_master_authorization() TO "anon";
GRANT ALL ON FUNCTION public.request_master_authorization() TO "authenticated";
GRANT ALL ON FUNCTION public.request_master_authorization() TO "service_role";

-- RLS: solo masters autorizados pueden crear sesiones / ser elegidos
DROP POLICY IF EXISTS "Crear sesiones logueados" ON "public"."game_sessions";

CREATE POLICY "Crear sesiones autorizados" ON "public"."game_sessions"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "public"."dagger_masters" "d"
      WHERE "d"."id" = "master_id"
        AND "d"."status" = 'authorized'
    )
    AND (
      ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
      OR ("master_id" = "auth"."uid"())
    )
  );

-- RLS: ocultar masters no autorizados al público
DROP POLICY IF EXISTS "Lectura pública masters" ON "public"."dagger_masters";

CREATE POLICY "Lectura masters autorizados anon" ON "public"."dagger_masters"
  FOR SELECT TO "anon"
  USING ("status" = 'authorized');

CREATE POLICY "Lectura masters autorizados auth" ON "public"."dagger_masters"
  FOR SELECT TO "authenticated"
  USING (
    ("status" = 'authorized')
    OR ("id" = "auth"."uid"())
    OR ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
  );

-- RLS: ocultar sesiones de masters no autorizados al público
DROP POLICY IF EXISTS "Lectura pública sesiones" ON "public"."game_sessions";

CREATE POLICY "Lectura sesiones autorizados anon" ON "public"."game_sessions"
  FOR SELECT TO "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."dagger_masters" "d"
      WHERE "d"."id" = "master_id"
        AND "d"."status" = 'authorized'
    )
  );

CREATE POLICY "Lectura sesiones autorizados auth" ON "public"."game_sessions"
  FOR SELECT TO "authenticated"
  USING (
    EXISTS (
      SELECT 1
      FROM "public"."dagger_masters" "d"
      WHERE "d"."id" = "master_id"
        AND "d"."status" = 'authorized'
    )
    OR ("master_id" = "auth"."uid"())
    OR ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
  );