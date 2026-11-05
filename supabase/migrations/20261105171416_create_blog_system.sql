-- Table: blog_posts
CREATE TABLE blog_posts (
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
CREATE TABLE blog_tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Table: blog_posts_tags
CREATE TABLE blog_posts_tags (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id BIGINT REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Storage Bucket: blog-posts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-posts', 'blog-posts', true);

-- RLS Policies for blog_posts
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public Read: Only published posts
CREATE POLICY "Public Read blog_posts" 
ON blog_posts FOR SELECT 
USING (status = 'published');

-- Author/Admin Read: All posts (drafts included)
CREATE POLICY "Authorized Read blog_posts" 
ON blog_posts FOR SELECT 
USING (
    auth.uid() = author_id 
    OR 
    EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

-- Create: Only authorized dagger_masters
CREATE POLICY "Create blog_posts" 
ON blog_posts FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

-- Update/Delete: Author or Admin
CREATE POLICY "Update blog_posts" 
ON blog_posts FOR UPDATE 
USING (
    auth.uid() = author_id 
    OR 
    EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
) 
WITH CHECK (
    auth.uid() = author_id 
    OR 
    EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

CREATE POLICY "Delete blog_posts" 
ON blog_posts FOR DELETE 
USING (
    auth.uid() = author_id 
    OR 
    EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

-- Storage Policies for blog-posts bucket
CREATE POLICY "Public Access blog-posts" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'blog-posts');

CREATE POLICY "Authorized Upload blog-posts" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'blog-posts' 
    AND EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

CREATE POLICY "Authorized Delete blog-posts" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'blog-posts' 
    AND (
        storage.foldername(name)[1] = (SELECT lower(auth.uid()::text)) -- simplified path logic
        OR EXISTS (
            SELECT 1 FROM dagger_masters 
            WHERE user_id = auth.uid() AND status = 'authorized'
        )
    )
);

CREATE POLICY "Authorized Update blog-posts" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'blog-posts' 
    AND EXISTS (
        SELECT 1 FROM dagger_masters 
        WHERE user_id = auth.uid() AND status = 'authorized'
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER set_blog_posts_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE PROCEDURE update_blog_posts_updated_at();
