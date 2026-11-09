-- ============================================================================
-- Limpieza al borrar un usuario de auth:
--   - sus posts del blog se borran (y con ellos tags, likes, comentarios e
--     historial por las cascadas existentes);
--   - sus likes y comentarios se conservan con user_id = NULL;
--   - su perfil de dagger_masters se borra por trigger, lo que cascadea sus
--     game_sessions y su fila de admins (si la tuviera).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Posts del blog: al borrar el autor se borran sus posts.
-- ----------------------------------------------------------------------------

ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_author_id_fkey;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Likes: se conservan (mantienen el conteo) sin autor.
-- ----------------------------------------------------------------------------

ALTER TABLE public.blog_likes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.blog_likes
  DROP CONSTRAINT IF EXISTS blog_likes_user_id_fkey;

ALTER TABLE public.blog_likes
  ADD CONSTRAINT blog_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. Comentarios: se conservan (mantienen el hilo) sin autor y se muestran
--    como "Anónimo".
-- ----------------------------------------------------------------------------

ALTER TABLE public.blog_comments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.blog_comments
  DROP CONSTRAINT IF EXISTS blog_comments_user_id_fkey;

ALTER TABLE public.blog_comments
  ADD CONSTRAINT blog_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- El trigger de profundidad debe permitir que el autor pase a NULL (acción
-- SET NULL), pero seguir bloqueando que se reasigne a otro usuario.
CREATE OR REPLACE FUNCTION public.set_blog_comment_depth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    parent_depth SMALLINT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.post_id IS DISTINCT FROM OLD.post_id
           OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
           OR (NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL) THEN
            RAISE EXCEPTION 'No se puede mover un comentario de post, hilo o autor'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF NEW.parent_id IS NULL THEN
        NEW.depth := 0;
    ELSE
        SELECT c.depth
        INTO parent_depth
        FROM public.blog_comments c
        WHERE c.id = NEW.parent_id
          AND c.post_id = NEW.post_id;

        IF parent_depth IS NULL THEN
            RAISE EXCEPTION 'El comentario padre no existe en este post'
                USING ERRCODE = 'foreign_key_violation';
        END IF;

        NEW.depth := parent_depth + 1;
    END IF;

    IF NEW.depth > 5 THEN
        RAISE EXCEPTION 'Profundidad máxima de respuestas alcanzada (5)'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

-- updated_at solo debe cambiar cuando se edita el contenido: el SET NULL del
-- autor no debe marcar el comentario como editado.
DROP TRIGGER IF EXISTS set_blog_comments_updated_at ON public.blog_comments;
CREATE TRIGGER set_blog_comments_updated_at
BEFORE UPDATE OF content ON public.blog_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_comments_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Perfil de master: se borra al borrar el usuario de auth.
--    Se hace por trigger (y no con una FK) para no romper los masters creados
--    manualmente desde /admin/masters, que no tienen usuario de auth.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_master_profile_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.dagger_masters WHERE id = OLD.id;
    RETURN OLD;
END;
$$;

ALTER FUNCTION public.delete_master_profile_on_user_delete() OWNER TO "postgres";

DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup_profile ON auth.users;
CREATE TRIGGER on_auth_user_deleted_cleanup_profile
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_master_profile_on_user_delete();

NOTIFY pgrst, 'reload schema';
