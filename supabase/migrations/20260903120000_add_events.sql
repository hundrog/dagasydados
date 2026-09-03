-- Tabla de eventos para agrupar mesas/sesiones
CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "image_url" "text",
    "start_datetime" timestamp without time zone NOT NULL,
    "end_datetime" timestamp without time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "public"."events" OWNER TO "postgres";

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);

-- FK en game_sessions
ALTER TABLE ONLY "public"."game_sessions"
    ADD COLUMN "event_id" "uuid";

ALTER TABLE ONLY "public"."game_sessions"
    ADD CONSTRAINT "game_sessions_event_id_fkey"
    FOREIGN KEY (event_id) REFERENCES "public"."events"(id) ON DELETE SET NULL;

-- RLS: lectura pública, escritura solo admin
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer eventos publico" ON "public"."events"
    FOR SELECT TO "anon"
    USING (true);

CREATE POLICY "Leer eventos autenticado" ON "public"."events"
    FOR SELECT TO "authenticated"
    USING (true);

CREATE POLICY "Crear eventos admin" ON "public"."events"
    FOR INSERT TO "authenticated"
    WITH CHECK (
        "auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins")
    );

CREATE POLICY "Editar eventos admin" ON "public"."events"
    FOR UPDATE TO "authenticated"
    USING (
        "auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins")
    )
    WITH CHECK (
        "auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins")
    );

CREATE POLICY "Borrar eventos admin" ON "public"."events"
    FOR DELETE TO "authenticated"
    USING (
        "auth"."uid"() IN (SELECT "admins"."id" FROM "public"."admins")
    );
