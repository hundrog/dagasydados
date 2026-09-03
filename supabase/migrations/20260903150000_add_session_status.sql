-- Estado de publicación de game_sessions: borrador o publicada
DO $$ 
BEGIN
  CREATE TYPE public.session_status AS ENUM ('draft', 'published');
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignore the error if it already exists
END $$;

ALTER TABLE "public"."game_sessions"
    ADD COLUMN IF NOT EXISTS "status" public.session_status NOT NULL DEFAULT 'published'::public.session_status;

-- RLS: ocultar borradores (draft) al público; solo owner/admin los ven.
-- Las sesiones de masters no autorizados ya están ocultas por la política existente.

DROP POLICY IF EXISTS "Lectura sesiones autorizados anon" ON "public"."game_sessions";

CREATE POLICY "Lectura sesiones publicadas anon" ON "public"."game_sessions"
  FOR SELECT TO "anon"
  USING (
    ("status" = 'published'::public.session_status)
    AND EXISTS (
      SELECT 1
      FROM "public"."dagger_masters" "d"
      WHERE "d"."id" = "master_id"
        AND "d"."status" = 'authorized'
    )
  );

DROP POLICY IF EXISTS "Lectura sesiones autorizados auth" ON "public"."game_sessions";

CREATE POLICY "Lectura sesiones publicadas auth" ON "public"."game_sessions"
  FOR SELECT TO "authenticated"
  USING (
    (
      ("status" = 'published'::public.session_status)
      AND EXISTS (
        SELECT 1
        FROM "public"."dagger_masters" "d"
        WHERE "d"."id" = "master_id"
          AND "d"."status" = 'authorized'
      )
    )
    OR ("master_id" = "auth"."uid"())
    OR ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
  );
