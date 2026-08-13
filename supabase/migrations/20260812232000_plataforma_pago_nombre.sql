ALTER TABLE "public"."dagger_masters"
  RENAME COLUMN "plataforma_pago" TO "plataforma_pago_cuenta";

ALTER TABLE "public"."dagger_masters"
  ADD COLUMN IF NOT EXISTS "plataforma_pago" text;

COMMENT ON COLUMN "public"."dagger_masters"."plataforma_pago"
  IS 'Nombre de la plataforma de pago (BBVA, PayPal, Ko-fi, etc.).';

COMMENT ON COLUMN "public"."dagger_masters"."plataforma_pago_cuenta"
  IS 'Link o cuenta donde el master recibe pagos.';
