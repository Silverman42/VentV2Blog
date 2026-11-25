/** Server-only helpers shared by actions, pages and the layout. */
import { isActionError } from 'astro:actions';
import { blogApiFetch, normalizePost } from './client';
import type { BlogCategory, BlogPostDetail } from './types';

const CATEGORY_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; data: BlogCategory[] } | null = null;

/**
 * Category tree, cached in memory for 5 minutes. The layout needs it on every request
 * (drawer, search chips), so this avoids one API call per page view. Throws an ActionError on failure.
 */
export async function getCategoryTree(): Promise<BlogCategory[]> {
  if (cached && Date.now() - cached.at < CATEGORY_TTL_MS) return cached.data;
  const body = await blogApiFetch<{ categories: BlogCategory[] }>(
    '/api/blog/categories',
    {},
    'Unable to fetch blog categories at this time.',
  );
  const data = body.data?.categories ?? [];
  cached = { at: Date.now(), data };
  return data;
}

/** Same as getCategoryTree, but returns [] instead of throwing (for chrome like the drawer). */
export const getCategoryTreeSafe = () => getCategoryTree().catch(() => [] as BlogCategory[]);

/** WordPress slugs are lowercase letters, digits and hyphens; anything else can't match a post. */
export const isValidSlug = (slug: string | undefined): slug is string => !!slug && /^[a-z0-9-]{1,200}$/.test(slug);

/**
 * One published post for its page. Returns null when there's no such post (404 or a malformed slug);
 * throws an ActionError when the API or WordPress is unavailable.
 */
export async function getPostBySlug(slug: string | undefined): Promise<BlogPostDetail | null> {
  if (!isValidSlug(slug)) return null;
  try {
    const body = await blogApiFetch<BlogPostDetail>(
      `/api/blog/posts/${encodeURIComponent(slug)}`,
      {},
      'Unable to fetch this blog post at this time.',
    );
    return body.data ? normalizePost(body.data) : null;
  } catch (err) {
    if (isActionError(err) && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}
