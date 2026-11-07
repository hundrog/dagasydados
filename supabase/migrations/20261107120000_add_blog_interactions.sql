-- ============================================================================
-- BLG-1004: likes, comentarios en hilo e historial de ediciones del blog
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blog_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT blog_likes_post_user_key UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID,
    content TEXT NOT NULL,
    depth SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT blog_comments_content_check CHECK (length(btrim(content)) BETWEEN 1 AND 5000),
    CONSTRAINT blog_comments_self_parent_check CHECK (parent_id IS NULL OR parent_id <> id),
    CONSTRAINT blog_comments_depth_check CHECK (depth BETWEEN 0 AND 5),
    -- Necesario para la FK compuesta que asegura que el padre es del mismo post.
    CONSTRAINT blog_comments_post_id_key UNIQUE (post_id, id),
    CONSTRAINT blog_comments_parent_fkey
        FOREIGN KEY (post_id, parent_id)
        REFERENCES public.blog_comments(post_id, id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.blog_comment_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
    old_content TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.blog_likes IS 'Likes de usuarios autenticados sobre posts publicados.';
COMMENT ON TABLE public.blog_comments IS 'Comentarios del blog con soporte de respuestas en hilo (máx. 5 niveles).';
COMMENT ON TABLE public.blog_comment_history IS 'Versión anterior del contenido de un comentario al editarlo.';
COMMENT ON COLUMN public.blog_comments.depth IS 'Profundidad en el hilo: 0 para comentarios raíz, máximo 5.';

-- ----------------------------------------------------------------------------
-- 2. Funciones y triggers
-- ----------------------------------------------------------------------------

-- Mantiene updated_at igual que en blog_posts.
CREATE OR REPLACE FUNCTION public.set_blog_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_blog_comments_updated_at ON public.blog_comments;
CREATE TRIGGER set_blog_comments_updated_at
BEFORE UPDATE ON public.blog_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_comments_updated_at();

-- Guarda la versión anterior antes de cada edición. El cliente nunca escribe
-- en el historial: así no puede falsificar el contenido previo.
CREATE OR REPLACE FUNCTION public.log_blog_comment_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.blog_comment_history (comment_id, old_content, changed_by)
    VALUES (NEW.id, OLD.content, COALESCE(auth.uid(), NEW.user_id));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_blog_comment_edit ON public.blog_comments;
CREATE TRIGGER log_blog_comment_edit
BEFORE UPDATE OF content ON public.blog_comments
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content)
EXECUTE FUNCTION public.log_blog_comment_edit();

-- Calcula depth y protege los campos que no deben cambiar tras crear el
-- comentario (post, hilo y autor). También corta el anidamiento en 5.
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
           OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
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

DROP TRIGGER IF EXISTS set_blog_comment_depth ON public.blog_comments;
CREATE TRIGGER set_blog_comment_depth
BEFORE INSERT OR UPDATE ON public.blog_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_comment_depth();

-- Resuelve la identidad de los autores de comentarios. No se puede hacer con
-- un join normal desde el cliente porque la RLS de dagger_masters solo expone
-- públicamente a los masters autorizados (los comentaristas suelen ser players).
CREATE OR REPLACE FUNCTION public.blog_comment_authors(p_user_ids uuid[])
RETURNS TABLE (id uuid, user_name text, full_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT DISTINCT dm.id, dm.user_name, dm.full_name, dm.avatar_url
    FROM public.dagger_masters dm
    JOIN public.blog_comments bc ON bc.user_id = dm.id
    JOIN public.blog_posts bp ON bp.id = bc.post_id
    WHERE dm.id = ANY(p_user_ids)
      AND (
          bp.status = 'published'
          OR auth.uid() IN (SELECT id FROM public.admins)
      );
$$;

REVOKE ALL ON FUNCTION public.blog_comment_authors(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_comment_authors(uuid[]) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Grants (RLS sigue aplicando)
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.blog_likes, public.blog_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.blog_likes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT SELECT ON public.blog_comment_history TO authenticated;
GRANT ALL ON public.blog_likes, public.blog_comments, public.blog_comment_history TO service_role;
-- El historial nunca debe ser legible por anónimos, aunque las default
-- privileges de Supabase les den ALL por defecto.
REVOKE ALL ON public.blog_comment_history FROM anon;

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read blog_likes" ON public.blog_likes;
CREATE POLICY "Public Read blog_likes"
ON public.blog_likes FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_likes.post_id
          AND bp.status = 'published'
    )
);

DROP POLICY IF EXISTS "Create blog_likes" ON public.blog_likes;
CREATE POLICY "Create blog_likes"
ON public.blog_likes FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_likes.post_id
          AND bp.status = 'published'
    )
);

DROP POLICY IF EXISTS "Delete blog_likes" ON public.blog_likes;
CREATE POLICY "Delete blog_likes"
ON public.blog_likes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read blog_comments" ON public.blog_comments;
CREATE POLICY "Public Read blog_comments"
ON public.blog_comments FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_comments.post_id
          AND bp.status = 'published'
    )
    OR auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Create blog_comments" ON public.blog_comments;
CREATE POLICY "Create blog_comments"
ON public.blog_comments FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.id = blog_comments.post_id
          AND bp.status = 'published'
    )
);

-- Solo el autor puede editar; el trigger set_blog_comment_depth impide mover
-- el comentario de post, hilo o autor.
DROP POLICY IF EXISTS "Update blog_comments" ON public.blog_comments;
CREATE POLICY "Update blog_comments"
ON public.blog_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete blog_comments" ON public.blog_comments;
CREATE POLICY "Delete blog_comments"
ON public.blog_comments FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.admins)
);

ALTER TABLE public.blog_comment_history ENABLE ROW LEVEL SECURITY;

-- Nota: la autoría del comentario se comprueba contra blog_comments, por lo
-- que RLS de blog_comments también aplica a la subconsulta.
DROP POLICY IF EXISTS "Read blog_comment_history" ON public.blog_comment_history;
CREATE POLICY "Read blog_comment_history"
ON public.blog_comment_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.blog_comments bc
        WHERE bc.id = blog_comment_history.comment_id
          AND (
              bc.user_id = auth.uid()
              OR auth.uid() IN (SELECT id FROM public.admins)
          )
    )
);

-- Sin políticas de INSERT/UPDATE/DELETE: solo escribe el trigger SECURITY DEFINER.

-- ----------------------------------------------------------------------------
-- 5. Índices
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_blog_likes_post_id ON public.blog_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON public.blog_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_created ON public.blog_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON public.blog_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON public.blog_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_blog_comment_history_comment ON public.blog_comment_history (comment_id, changed_at);

-- Fuerza a PostgREST a recargar el schema cache para exponer la nueva RPC.
NOTIFY pgrst, 'reload schema';
