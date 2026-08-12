


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.dagger_masters (
    id,
    full_name,
    user_name,
    avatar_url,
    phone,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'name',      -- Discord username
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    new.phone,                             -- De auth.users.phone si existe
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dagger_masters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_name" "text",
    "full_name" "text",
    "avatar_url" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "descripcion" "text",
    "profile" "jsonb" DEFAULT '{"homebrew": {"mundo": "...", "mecanicas": "..."}, "referencias": {"libros": ["..."], "peliculas": ["..."], "videojuegos": ["..."], "series_anime": ["..."]}, "estilo_juego": {"roll": 2, "puzzle": 4, "tactico": 3, "narrativo": 1}}'::"jsonb"
);


ALTER TABLE "public"."dagger_masters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "tipo" character varying(50),
    "nueva_hora_inicio" time without time zone,
    "nueva_hora_fin" time without time zone,
    "nueva_location" character varying(255),
    "nueva_descripcion" "text",
    "razon" character varying(255),
    "creado_en" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."game_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "master_id" "uuid" NOT NULL,
    "image_url" "text",
    "system" character varying(100),
    "session_type" character varying(100),
    "audience" character varying(100),
    "mode" character varying(50),
    "max_players" integer,
    "description" "text",
    "location" character varying(255),
    "campaign" character varying(255),
    "costo" numeric(10,2),
    "fecha_inicio" "date" NOT NULL,
    "hora_inicio" time without time zone,
    "hora_fin" time without time zone,
    "rrule" character varying(500),
    "zona_horaria" character varying(50) DEFAULT 'America/Mexico_City'::character varying,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."game_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_session_id" "uuid" NOT NULL,
    "telefono" character varying(20) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."session_players" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dagger_masters"
    ADD CONSTRAINT "dagger_masters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_exceptions"
    ADD CONSTRAINT "game_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_exceptions"
    ADD CONSTRAINT "game_exceptions_session_id_fecha_key" UNIQUE ("session_id", "fecha");



ALTER TABLE ONLY "public"."game_sessions"
    ADD CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_game_session_id_telefono_key" UNIQUE ("game_session_id", "telefono");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_profile_estilo_juego" ON "public"."dagger_masters" USING "gin" ((("profile" -> 'estilo_juego'::"text")));



CREATE INDEX "idx_profile_referencias" ON "public"."dagger_masters" USING "gin" ((("profile" -> 'referencias'::"text")));



CREATE INDEX "idx_session_players_game_session_id" ON "public"."session_players" USING "btree" ("game_session_id");



CREATE INDEX "idx_session_players_telefono" ON "public"."session_players" USING "btree" ("telefono");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."dagger_masters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_exceptions"
    ADD CONSTRAINT "game_exceptions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_sessions"
    ADD CONSTRAINT "game_sessions_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "public"."dagger_masters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



CREATE POLICY "Borrar excepciones logueados" ON "public"."game_exceptions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Borrar masters solo admin" ON "public"."dagger_masters" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")));



CREATE POLICY "Borrar sesiones logueados y admin" ON "public"."game_sessions" FOR DELETE TO "authenticated" USING ((("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")) OR ("auth"."uid"() = "master_id")));



CREATE POLICY "Borrar session_players autenticado" ON "public"."session_players" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Crear excepciones logueados" ON "public"."game_exceptions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Crear masters solo admin" ON "public"."dagger_masters" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")));



CREATE POLICY "Crear sesiones logueados" ON "public"."game_sessions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Crear session_players público" ON "public"."session_players" FOR INSERT WITH CHECK (true);



CREATE POLICY "Editar excepciones logueados" ON "public"."game_exceptions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Editar masters admin y owner" ON "public"."dagger_masters" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")) OR ("auth"."uid"() = "id"))) WITH CHECK ((("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")) OR ("auth"."uid"() = "id")));



CREATE POLICY "Editar sesiones logueados y admin" ON "public"."game_sessions" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")) OR ("auth"."uid"() = "master_id"))) WITH CHECK ((("auth"."uid"() IN ( SELECT "admins"."id"
   FROM "public"."admins")) OR ("auth"."uid"() = "master_id")));



CREATE POLICY "Editar session_players autenticado" ON "public"."session_players" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Lectura pública excepciones" ON "public"."game_exceptions" FOR SELECT USING (true);



CREATE POLICY "Lectura pública masters" ON "public"."dagger_masters" FOR SELECT USING (true);



CREATE POLICY "Lectura pública sesiones" ON "public"."game_sessions" FOR SELECT USING (true);



CREATE POLICY "Lectura pública session_players" ON "public"."session_players" FOR SELECT USING (true);



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dagger_masters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public admins" ON "public"."admins" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."session_players" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";










GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";











GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."dagger_masters" TO "anon";
GRANT ALL ON TABLE "public"."dagger_masters" TO "authenticated";
GRANT ALL ON TABLE "public"."dagger_masters" TO "service_role";



GRANT ALL ON TABLE "public"."game_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."game_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."game_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."game_sessions" TO "anon";
GRANT ALL ON TABLE "public"."game_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."game_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."session_players" TO "anon";
GRANT ALL ON TABLE "public"."session_players" TO "authenticated";
GRANT ALL ON TABLE "public"."session_players" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































