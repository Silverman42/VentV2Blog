import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    id: z.string(),
    title: z.string().max(120),
    excerpt: z.string().max(200),
    category: z.enum(['guides', 'markets', 'product', 'security', 'lifestyle']),
    author: z.enum(['ao', 'km', 'ta', 'ea']),
    publishedAt: z.coerce.date(),
    readTime: z.number().int().positive(),
    coverImage: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { posts };
