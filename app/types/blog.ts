export interface BlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string | null
  thumbnail?: string | null
  author_id: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export type BlogPostWithTags = BlogPost & { tags: BlogTag[] }

export interface BlogAuthorRef {
  id: string
  full_name: string | null
  user_name: string | null
}

export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  created_at: string
  author_id: string
  thumbnail: string | null
  author: BlogAuthorRef | null
}

export interface BlogTag {
  id: number
  name: string
}

export interface BlogPostTag {
  post_id: string
  tag_id: number
}
