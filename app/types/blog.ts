export interface BlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt?: string | null
  thumbnail?: string | null
  author_id: string
  status: string
  created_at: string
  updated_at: string
}

export type BlogPostWithTags = BlogPost & { tags: BlogTag[] }

export interface BlogPostInteractionCounts {
  like_count: number
  comment_count: number
}

export type BlogPostWithAuthor = BlogPost & BlogPostInteractionCounts & {
  author: BlogAuthorRef | null
}

export type BlogPostDetail = BlogPostWithTags & {
  author: BlogAuthorRef | null
  publishedAt: string
}

export interface BlogAuthorRef {
  id: string
  full_name: string | null
  user_name: string | null
}

export interface BlogPostSummary {
  id: string
  slug: string
  title: string
  status: string
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

export interface BlogLike {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface BlogCommentAuthorRef extends BlogAuthorRef {
  avatar_url: string | null
}

export interface BlogComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  depth: number
  created_at: string
  updated_at: string
  author: BlogCommentAuthorRef | null
  replies: BlogComment[]
  isOptimistic?: boolean
}

export interface BlogCommentHistoryEntry {
  id: number
  comment_id: string
  old_content: string
  changed_by: string | null
  changed_at: string
}

export interface BlogCommentLikeCount {
  count: number
  liked: boolean
}

export const BLOG_COMMENT_MAX_LENGTH = 5000
export const BLOG_COMMENT_MAX_DEPTH = 5
