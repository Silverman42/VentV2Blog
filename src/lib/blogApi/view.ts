/**
 * Client-safe helpers that turn blog API data into what the cards and tabs render.
 * No server-only imports here: scripts/listing.ts and scripts/search.ts use this too.
 */
import type { BlogCategory, BlogPost } from './types';

/** What a post card needs. Local markdown posts (PostSummary) and API posts both fit it. */
export interface CardPost {
  id: string;
  slug: string;
  url: string;
  title: string;
  excerpt: string;
  /** Category slug, used for the chip link and the cover placeholder tint. */
  cat: string;
  /** Category display name. */
  category: string;
  /** YYYY-MM-DD for <time datetime>. */
  iso: string;
  /** Display date, e.g. "20 Nov 2026". */
  date: string;
  author?: string;
  coverImage?: string;
  coverAlt?: string;
}

/** Flat category entry, small enough to inline as JSON for the client. */
export interface CategoryRef {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
}

export function flattenCategories(tree: BlogCategory[], parentId: number | null = null): CategoryRef[] {
  return tree.flatMap((c) => [
    { id: c.id, slug: c.slug, name: c.name, parentId },
    ...flattenCategories(c.subcategories ?? [], c.id),
  ]);
}

/** On-site URL of a post's page. Every post link on the site goes here, never to blog.vent.africa. */
export const postPath = (slug: string) => `/posts/${slug}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** UTC on both server and client so server-rendered and client-rendered cards agree. */
export const formatDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/**
 * Picks the category a card shows: the most specific one the post is filed under
 * (a subcategory over its parent), preferring `withinId`'s subtree when given.
 */
export function primaryCategory(post: BlogPost, cats: CategoryRef[], withinId?: number): CategoryRef | undefined {
  const known = post.categoryIds.map((id) => cats.find((c) => c.id === id)).filter((c): c is CategoryRef => !!c);
  const inScope = withinId ? known.filter((c) => c.id === withinId || c.parentId === withinId) : [];
  const pool = inScope.length ? inScope : known;
  return pool.find((c) => c.parentId !== null) ?? pool[0];
}

export function toCard(post: BlogPost, cats: CategoryRef[], withinId?: number): CardPost {
  const cat = primaryCategory(post, cats, withinId);
  const published = new Date(post.publishedAt);
  const valid = !Number.isNaN(published.getTime());
  return {
    id: String(post.id),
    slug: post.slug,
    url: postPath(post.slug),
    title: post.title,
    excerpt: post.excerpt,
    cat: cat?.slug ?? '',
    category: cat?.name ?? 'Blog',
    iso: valid ? published.toISOString().slice(0, 10) : '',
    date: valid ? formatDate(published) : '',
    coverImage: post.coverPhotoUrl ?? undefined,
    coverAlt: post.title,
  };
}
