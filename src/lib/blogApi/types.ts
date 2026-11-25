/** Types for the Vent blog API (GET /api/blog/*). Mirrors blog-api-mobile-integration.md. */

export interface BlogCategory {
  /** Pass as `categoryId` to the posts and search actions. */
  id: number;
  name: string;
  slug: string;
  /** Posts in this category including its subcategories. */
  postCount: number;
  subcategories: BlogCategory[];
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  /** Full article URL on blog.vent.africa. */
  link: string;
  coverPhotoUrl: string | null;
  /** Every category the post is filed under, parents and subcategories alike. */
  categoryIds: number[];
  /** ISO 8601 UTC. Normalised by the client to end in `Z`. */
  publishedAt: string;
  modifiedAt: string;
}

/** SEO data for a single post (Yoast, with fallbacks applied by the API). */
export interface BlogPostSeo {
  /** Meant for <title> and share cards; usually ends in "| Vent". Not the on-page heading. */
  title: string;
  description: string;
  /** The post's tags; [] when it has none. */
  keywords: string[];
  canonicalUrl: string;
  imageUrl: string | null;
}

/** A single post from GET /api/blog/posts/{slug}: a feed item plus the full article. */
export interface BlogPostDetail extends BlogPost {
  /** Full article as HTML. */
  content: string;
  author: string | null;
  readingTimeMinutes: number | null;
  seo: BlogPostSeo;
}

/** Pagination meta as returned by the API (snake_case). */
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/** Standard API envelope. */
export interface ApiEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | unknown[];
  meta?: PaginationMeta;
  links?: PaginationLinks;
}

/** One page of posts as returned by the posts and search actions. */
export interface BlogPostPage {
  posts: BlogPost[];
  meta: PaginationMeta;
  /** Page number to request next, or null on the last page. */
  nextPage: number | null;
}
