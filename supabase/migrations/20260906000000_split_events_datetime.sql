-- Separar fecha y hora en la tabla events
-- Patrón similar a game_sessions (fecha_inicio, hora_inicio, hora_fin, zona_horaria)

ALTER TABLE "public"."events"
    ADD COLUMN "fecha_inicio" "date",
    ADD COLUMN "hora_inicio" time without time zone,
    ADD COLUMN "fecha_fin" "date",
    ADD COLUMN "hora_fin" time without time zone,
    ADD COLUMN "zona_horaria" character varying(50) DEFAULT 'America/Mexico_City'::character varying;

-- Backfill desde los timestamps existentes
UPDATE "public"."events"
SET
    "fecha_inicio" = "start_datetime"::date,
    "hora_inicio" = "start_datetime"::time,
    "fecha_fin" = "end_datetime"::date,
    "hora_fin" = "end_datetime"::time;

-- Las fechas quedan NOT NULL; las horas opcionales (patrón game_sessions)
ALTER TABLE "public"."events"
    ALTER COLUMN "fecha_inicio" SET NOT NULL,
    ALTER COLUMN "fecha_fin" SET NOT NULL;

-- Eliminar columnas obsoletas
ALTER TABLE "public"."events"
    DROP COLUMN "start_datetime",
    DROP COLUMN "end_datetime";