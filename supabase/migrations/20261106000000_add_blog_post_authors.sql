-- Public byline: resolves the author name of published posts.
-- SECURITY DEFINER porque la RLS de dagger_masters solo expone masters
-- autorizados, pero el autor de un post publicado debe poder mostrarse.
CREATE OR REPLACE FUNCTION public.blog_post_authors(p_author_ids uuid[])
RETURNS TABLE (id uuid, user_name text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT DISTINCT dm.id, dm.user_name, dm.full_name
    FROM public.dagger_masters dm
    JOIN public.blog_posts bp ON bp.author_id = dm.id
    WHERE bp.status = 'published'
      AND dm.id = ANY(p_author_ids);
$$;

REVOKE ALL ON FUNCTION public.blog_post_authors(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_post_authors(uuid[]) TO anon, authenticated;

-- Fuerza a PostgREST a recargar el schema cache para exponer la nueva RPC.
NOTIFY pgrst, 'reload schema';
