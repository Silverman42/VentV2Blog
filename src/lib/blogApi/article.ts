/**
 * Server-side preparation of a single post for its page: cleans the WordPress HTML, adds heading
 * anchors for the table of contents, and routes links to other blog posts to their on-site page.
 */
import type { MarkdownHeading } from 'astro';
import type { BlogPostDetail, BlogPostSeo } from './types';
import { postPath, toCard, type CardPost, type CategoryRef } from './view';

/** Everything the post page components render. */
export interface PostPage extends Omit<CardPost, 'author'> {
  author: string | null;
  /** e.g. "14 min read", or null when the API has no estimate. */
  readTime: string | null;
  /** Full article on blog.vent.africa; used for sharing. */
  link: string;
  /** Full ISO timestamps for structured data. */
  publishedAt: string;
  modifiedAt: string;
  /** Cleaned article HTML. */
  html: string;
  headings: MarkdownHeading[];
  seo: BlogPostSeo;
  /** Category id the page is filed under (for breadcrumbs and related posts). */
  categoryId?: number;
}

const BLOG_HOSTS = /^https?:\/\/(?:www\.)?blog\.vent\.africa\//i;
/** First path segments on the WordPress site that are not posts. */
const NON_POST_PATHS = new Set([
  'wp-content', 'wp-admin', 'wp-includes', 'wp-json', 'category', 'tag', 'author', 'page', 'feed', 'search', 'comments',
]);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#8217': '’', '#8216': '‘', '#8220': '“', '#8221': '”', '#8211': '–', '#8212': '—', '#038': '&' };
const decode = (s: string) =>
  s.replace(/&(#?\w+);/g, (m, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e];
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : e.startsWith('#') ? parseInt(e.slice(1), 10) : NaN;
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
const stripTags = (s: string) => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80) || 'section';

/** Returns the on-site path for a link to a blog.vent.africa post, or null for any other URL. */
export function internalPostHref(href: string): string | null {
  if (!BLOG_HOSTS.test(href)) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 1 || NON_POST_PATHS.has(parts[0]) || !/^[a-z0-9-]+$/.test(parts[0])) return null;
  return postPath(parts[0]) + url.hash;
}

const attr = (attrs: string, name: string) =>
  attrs.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));

/** Cleans article HTML and collects its h2 headings for the table of contents. */
export function prepareContent(raw: string): { html: string; headings: MarkdownHeading[] } {
  // Defensive: the API sends no scripts, styles or iframes today, but the page renders this as-is.
  let html = raw
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, '')
    .replace(/<[a-z][^>]*>/gi, (tag) => tag.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''))
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');

  // Links: other blog posts open their on-site page; other sites open in a new tab.
  html = html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const href = attr(attrs, 'href');
    if (!href) return tag;
    const value = decode(href[2] ?? href[3] ?? '');
    const internal = internalPostHref(value);
    if (internal) {
      const rest = attrs.replace(href[0], '').replace(/\s(target|rel)\s*=\s*("[^"]*"|'[^']*')/gi, '');
      return `<a href="${internal}"${rest}>`;
    }
    if (/^https?:\/\//i.test(value) && !attr(attrs, 'target')) {
      return `<a${attrs} target="_blank" rel="noopener">`;
    }
    return tag;
  });

  // Images below the fold shouldn't block the page.
  html = html.replace(/<img\b(?![^>]*\sloading=)/gi, '<img loading="lazy" decoding="async"');

  // Headings: give every h2–h6 an id (keeping any it has) so the table of contents can link to it.
  // WordPress posts often start at h3, so the TOC component picks the shallowest level present.
  const headings: MarkdownHeading[] = [];
  const used = new Set<string>();
  html = html.replace(/<h([2-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, level: string, attrs: string, inner: string) => {
    const text = stripTags(inner);
    const existing = attr(attrs, 'id');
    let id = existing ? (existing[2] ?? existing[3] ?? '') : slugify(text);
    if (!existing) {
      const base = id;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      attrs = `${attrs} id="${id}"`;
    }
    used.add(id);
    if (text) headings.push({ depth: Number(level), slug: id, text });
    return `<h${level}${attrs}>${inner}</h${level}>`;
  });

  // In-article tables of contents (WordPress block plugins) build their anchors in the browser and
  // arrive as href="#undefined". Point any in-page link that matches no id at the heading with its text.
  html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (tag, attrs: string, inner: string) => {
    const href = attr(attrs, 'href');
    const value = href ? (href[2] ?? href[3] ?? '') : '';
    if (!value.startsWith('#') || used.has(value.slice(1))) return tag;
    const text = stripTags(inner);
    const match = headings.find((h) => h.text === text);
    return match ? `<a${attrs.replace(href![0], ` href="#${match.slug}"`)}>${inner}</a>` : tag;
  });

  return { html, headings };
}

export function toPostPage(post: BlogPostDetail, cats: CategoryRef[]): PostPage {
  const card = toCard(post, cats);
  const { html, headings } = prepareContent(post.content ?? '');
  const categoryId = cats.find((c) => c.slug === card.cat)?.id;
  return {
    ...card,
    // The feed excerpt is ~55 words ending in "[…]"; the meta description reads better as the page dek.
    excerpt: post.seo?.description || card.excerpt,
    author: post.author?.trim() || null,
    readTime: post.readingTimeMinutes ? `${post.readingTimeMinutes} min read` : null,
    link: post.link,
    publishedAt: post.publishedAt,
    modifiedAt: post.modifiedAt,
    html,
    headings,
    seo: post.seo,
    categoryId,
  };
}
