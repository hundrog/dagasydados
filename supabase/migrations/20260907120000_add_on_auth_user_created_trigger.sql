-- Crea el trigger en auth.users para que al registrar un nuevo usuario
-- se inserte automáticamente su entry en dagger_masters (vía handle_new_user).
-- El dump remoto (20260812224551) definió la función pero no el trigger,
-- ya que los triggers sobre auth.users no se capturan en un dump del esquema public.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();