-- Table: blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    thumbnail TEXT,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: blog_tags
CREATE TABLE IF NOT EXISTS public.blog_tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Table: blog_posts_tags
CREATE TABLE IF NOT EXISTS public.blog_posts_tags (
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    tag_id BIGINT REFERENCES public.blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Grants (RLS sigue aplicando)
GRANT SELECT ON public.blog_posts, public.blog_tags, public.blog_posts_tags TO anon;
GRANT ALL ON public.blog_posts, public.blog_tags, public.blog_posts_tags TO authenticated;
GRANT ALL ON public.blog_posts, public.blog_tags, public.blog_posts_tags TO service_role;

-- Storage Bucket: blog-posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-posts', 'blog-posts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read blog_posts" ON public.blog_posts;
-- Public Read: Only published posts
CREATE POLICY "Public Read blog_posts"
ON public.blog_posts FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Authorized Read blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin Read blog_posts" ON public.blog_posts;
-- Admin Read: All posts (drafts included). Public Read only exposes published posts.
CREATE POLICY "Admin Read blog_posts"
ON public.blog_posts FOR SELECT
USING (
    auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Create blog_posts" ON public.blog_posts;
-- Create: only admins, as themselves
CREATE POLICY "Create blog_posts"
ON public.blog_posts FOR INSERT
WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admins)
    AND auth.uid() = author_id
);

DROP POLICY IF EXISTS "Update blog_posts" ON public.blog_posts;
-- Update: only admins
CREATE POLICY "Update blog_posts"
ON public.blog_posts FOR UPDATE
USING (
    auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Delete blog_posts" ON public.blog_posts;
-- Delete: only admins
CREATE POLICY "Delete blog_posts"
ON public.blog_posts FOR DELETE
USING (
    auth.uid() IN (SELECT id FROM public.admins)
);

-- RLS Policies for blog_tags
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read blog_tags" ON public.blog_tags;
CREATE POLICY "Public Read blog_tags"
ON public.blog_tags FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authorized Write blog_tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Admin Write blog_tags" ON public.blog_tags;
CREATE POLICY "Admin Write blog_tags"
ON public.blog_tags FOR ALL
USING (
    auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admins)
);

-- RLS Policies for blog_posts_tags
ALTER TABLE public.blog_posts_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read blog_posts_tags" ON public.blog_posts_tags;
CREATE POLICY "Public Read blog_posts_tags"
ON public.blog_posts_tags FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authorized Write blog_posts_tags" ON public.blog_posts_tags;
DROP POLICY IF EXISTS "Admin Write blog_posts_tags" ON public.blog_posts_tags;
CREATE POLICY "Admin Write blog_posts_tags"
ON public.blog_posts_tags FOR ALL
USING (
    auth.uid() IN (SELECT id FROM public.admins)
)
WITH CHECK (
    auth.uid() IN (SELECT id FROM public.admins)
);

-- Storage Policies for blog-posts bucket
DROP POLICY IF EXISTS "Public Access blog-posts" ON storage.objects;
CREATE POLICY "Public Access blog-posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-posts');

DROP POLICY IF EXISTS "Authorized Upload blog-posts" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload blog-posts" ON storage.objects;
CREATE POLICY "Admin Upload blog-posts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'blog-posts'
    AND auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Authorized Delete blog-posts" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete blog-posts" ON storage.objects;
CREATE POLICY "Admin Delete blog-posts"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'blog-posts'
    AND auth.uid() IN (SELECT id FROM public.admins)
);

DROP POLICY IF EXISTS "Authorized Update blog-posts" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update blog-posts" ON storage.objects;
CREATE POLICY "Admin Update blog-posts"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'blog-posts'
    AND auth.uid() IN (SELECT id FROM public.admins)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE PROCEDURE public.update_blog_posts_updated_at();

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

