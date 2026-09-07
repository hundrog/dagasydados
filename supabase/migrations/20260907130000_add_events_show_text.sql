-- Agrega el flag show_text para mostrar solo la imagen del evento en el hero
ALTER TABLE "public"."events"
    ADD COLUMN "show_text" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "public"."events"."show_text"
    IS 'Si es false, el evento se muestra en el hero solo con la imagen, sin texto.';