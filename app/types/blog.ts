export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  author_id: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: number;
  name: string;
}

export interface BlogPostTag {
  post_id: string;
  tag_id: number;
}
