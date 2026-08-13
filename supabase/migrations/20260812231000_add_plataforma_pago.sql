ALTER TABLE "public"."dagger_masters"
  ADD COLUMN IF NOT EXISTS "plataforma_pago" text;

COMMENT ON COLUMN "public"."dagger_masters"."plataforma_pago"
  IS 'Link o cuenta donde el master recibe pagos (PayPal, CLABE, etc.).';
