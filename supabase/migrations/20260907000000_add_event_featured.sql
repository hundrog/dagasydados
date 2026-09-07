-- Agrega el campo 'featured' para destacar eventos en la portada
ALTER TABLE "public"."events"
    ADD COLUMN "featured" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "public"."events"."featured"
    IS 'Indica si el evento se destaca en la portada.';