DROP POLICY IF EXISTS "Crear sesiones logueados" ON "public"."game_sessions";

CREATE POLICY "Crear sesiones logueados" ON "public"."game_sessions"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR ("master_id" = "auth"."uid"())
  );

DROP POLICY IF EXISTS "Borrar session_players autenticado" ON "public"."session_players";
DROP POLICY IF EXISTS "Editar session_players autenticado" ON "public"."session_players";

CREATE POLICY "Borrar session_players owner o admin" ON "public"."session_players"
  FOR DELETE TO "authenticated"
  USING (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "session_players"."game_session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );

CREATE POLICY "Editar session_players owner o admin" ON "public"."session_players"
  FOR UPDATE TO "authenticated"
  USING (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "session_players"."game_session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  )
  WITH CHECK (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "session_players"."game_session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );

DROP POLICY IF EXISTS "Borrar excepciones logueados" ON "public"."game_exceptions";
DROP POLICY IF EXISTS "Crear excepciones logueados" ON "public"."game_exceptions";
DROP POLICY IF EXISTS "Editar excepciones logueados" ON "public"."game_exceptions";

CREATE POLICY "Crear excepciones owner o admin" ON "public"."game_exceptions"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "game_exceptions"."session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );

CREATE POLICY "Editar excepciones owner o admin" ON "public"."game_exceptions"
  FOR UPDATE TO "authenticated"
  USING (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "game_exceptions"."session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  )
  WITH CHECK (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "game_exceptions"."session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );

CREATE POLICY "Borrar excepciones owner o admin" ON "public"."game_exceptions"
  FOR DELETE TO "authenticated"
  USING (
    ("auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins"))
    OR EXISTS (
      SELECT 1
      FROM "public"."game_sessions" "s"
      WHERE "s"."id" = "game_exceptions"."session_id"
        AND "s"."master_id" = "auth"."uid"()
    )
  );
