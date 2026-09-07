-- Agrega slug y short_code a eventos para URLs cortas y legibles
CREATE EXTENSION IF NOT EXISTS "unaccent";

ALTER TABLE "public"."events"
    ADD COLUMN "slug" character varying(255),
    ADD COLUMN "short_code" character varying(16);

-- Slugs únicos
CREATE UNIQUE INDEX "events_slug_key" ON "public"."events" USING btree (slug);

-- Códigos cortos únicos
CREATE UNIQUE INDEX "events_short_code_key" ON "public"."events" USING btree (short_code);

COMMENT ON COLUMN "public"."events"."slug" IS 'Slug legible para la URL del evento (ej: convento-de-rol-2026).';
COMMENT ON COLUMN "public"."events"."short_code" IS 'Código corto aleatorio para compartir (ej: a3x9k2).';

-- Backfill: genera slug y short_code para eventos existentes
DO $$
DECLARE
    ev RECORD;
    new_slug character varying(255);
    base_slug character varying(255);
    new_code character varying(16);
    suffix integer;
BEGIN
    FOR ev IN SELECT id, name FROM "public"."events"
    LOOP
        -- Slug: lowercase, quita acentos, espacios -> guiones
        base_slug := lower(
            regexp_replace(
                regexp_replace(
                    unaccent(ev.name),
                    '[^a-z0-9\s-]',
                    '',
                    'g'
                ),
                '[\s-]+',
                '-',
                'g'
            )
        );
        base_slug := trim(BOTH '-' FROM base_slug);
        IF length(base_slug) = 0 THEN
            base_slug := 'evento';
        END IF;
        base_slug := left(base_slug, 80);

        -- Asegura unicidad del slug con sufijo
        new_slug := base_slug;
        suffix := 1;
        WHILE EXISTS (SELECT 1 FROM "public"."events" WHERE slug = new_slug AND id <> ev.id) LOOP
            new_slug := left(base_slug, 76) || '-' || suffix;
            suffix := suffix + 1;
        END LOOP;

        -- Código corto aleatorio único de 6 chars
        new_code := '';
        WHILE new_code = '' OR EXISTS (SELECT 1 FROM "public"."events" WHERE short_code = new_code) LOOP
            new_code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
        END LOOP;

        UPDATE "public"."events"
        SET slug = new_slug, short_code = new_code
        WHERE id = ev.id;
    END LOOP;
END
$$;