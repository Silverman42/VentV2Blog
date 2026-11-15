import { getCollection, type CollectionEntry } from 'astro:content';
import { AUTHORS, SITE, getCategory } from '../data/site';

export type PostEntry = CollectionEntry<'posts'>;

/** Flat, serialisable view of a post used by cards, carousel, search and the Saved page. */
export interface PostSummary {
  id: string;
  slug: string;
  url: string;
  title: string;
  excerpt: string;
  cat: string;
  category: string;
  author: string;
  authorSlug: string;
  iso: string;
  date: string;
  readTime: string;
  coverImage?: string;
  coverAlt?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDate = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export const toSummary = (entry: PostEntry): PostSummary => {
  const d = entry.data;
  return {
    id: d.id,
    slug: entry.id,
    url: `/posts/${entry.id}`,
    title: d.title,
    excerpt: d.excerpt,
    cat: d.category,
    category: getCategory(d.category)?.name ?? d.category,
    author: AUTHORS[d.author],
    authorSlug: d.author,
    iso: d.publishedAt.toISOString().slice(0, 10),
    date: formatDate(d.publishedAt),
    readTime: `${d.readTime} min read`,
    coverImage: d.coverImage,
    coverAlt: d.coverAlt ?? d.title,
  };
};

export async function getAllEntries(): Promise<PostEntry[]> {
  const all = await getCollection('posts');
  return all.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getAllPosts(): Promise<PostSummary[]> {
  return (await getAllEntries()).map(toSummary);
}

export async function getLatestPosts(limit: number) {
  return (await getAllPosts()).slice(0, limit);
}

export async function getPostsByCategory(slug: string) {
  return (await getAllPosts()).filter((p) => p.cat === slug);
}

export async function getRelated(post: PostSummary, limit = 2) {
  return (await getPostsByCategory(post.cat)).filter((p) => p.id !== post.id).slice(0, limit);
}

export const absoluteUrl = (path: string) => new URL(path, SITE.url).toString();
