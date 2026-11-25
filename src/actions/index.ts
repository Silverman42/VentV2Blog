import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { blogApiFetch, toPage } from '../lib/blogApi/client';
import { getCategoryTree, getPostBySlug } from '../lib/blogApi/server';
import type { BlogPost } from '../lib/blogApi/types';

// Limits match the API's own validation, so bad input fails here before a request goes out.
const page = z.number().int().min(1).default(1);
const perPage = z.number().int().min(1).max(100).default(15);
const categoryId = z.number().int().min(1).optional();

export const server = {
  blog: {
    /** Category tree (top-level categories with nested `subcategories`). */
    getCategories: defineAction({
      handler: () => getCategoryTree(),
    }),

    /** Newest-first post feed. A parent `categoryId` includes its subcategories' posts. */
    getPosts: defineAction({
      input: z.object({ page, perPage, categoryId }),
      handler: async (input) => toPage(await blogApiFetch<BlogPost[]>('/api/blog/posts', input)),
    }),

    /** A single published post with its full HTML content, author, reading time and SEO data. */
    getPost: defineAction({
      input: z.object({ slug: z.string().min(1).max(200) }),
      handler: async ({ slug }) => {
        const post = await getPostBySlug(slug);
        if (!post) throw new ActionError({ code: 'NOT_FOUND', message: 'Blog post not found.' });
        return post;
      },
    }),

    /** Best-match search over titles and content. Rate-limited to 60/min: debounce callers. */
    searchPosts: defineAction({
      input: z.object({
        query: z
          .string()
          .transform((q) => q.trim().replace(/\s+/g, ' '))
          .pipe(z.string().min(2).max(100)),
        page,
        perPage,
        categoryId,
      }),
      handler: async (input) => toPage(await blogApiFetch<BlogPost[]>('/api/blog/posts/search', input)),
    }),
  },
};
