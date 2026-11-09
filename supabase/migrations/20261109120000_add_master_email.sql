-- ============================================================================
-- Guarda el email de acceso en dagger_masters y lo mantiene sincronizado con
-- auth.users. Se muestra (sólo lectura) en /account y /admin/profile.
-- ============================================================================

ALTER TABLE public.dagger_masters
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.dagger_masters.email
  IS 'Email de acceso, sincronizado desde auth.users. No editable directamente.';

-- Backfill para los perfiles existentes.
UPDATE public.dagger_masters dm
SET email = au.email
FROM auth.users au
WHERE au.id = dm.id
  AND dm.email IS DISTINCT FROM au.email;

-- Al crear un usuario, handle_new_user inserta también su email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.dagger_masters (
    id,
    full_name,
    user_name,
    avatar_url,
    email,
    created_at
  )
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'name',
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    new.email,
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email
    WHERE public.dagger_masters.email IS DISTINCT FROM EXCLUDED.email;

  RETURN new;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO "postgres";

-- Si el usuario cambia su email desde auth, el perfil se actualiza igual.
CREATE OR REPLACE FUNCTION public.sync_master_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.dagger_masters
  SET email = NEW.email
  WHERE id = NEW.id
    AND email IS DISTINCT FROM NEW.email;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_master_email() OWNER TO "postgres";

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_master_email();

NOTIFY pgrst, 'reload schema';
