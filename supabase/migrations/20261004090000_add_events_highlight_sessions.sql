-- Agrega el flag highlight_sessions para controlar si las sesiones del evento
-- se muestran en una sección propia en la portada o junto a las demás
ALTER TABLE "public"."events"
    ADD COLUMN "highlight_sessions" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "public"."events"."highlight_sessions"
    IS 'Si es true, las sesiones del evento se muestran en una sección propia en la portada; si es false, se mezclan con el resto de las sesiones.';