import { ActionError } from 'astro:actions';
import { BLOG_API_APP_VERSION, BLOG_API_BASE_URL, BLOG_API_DEVICE_OS } from 'astro:env/server';
import type { ApiEnvelope, BlogPost, BlogPostPage } from './types';

type Params = Record<string, string | number | undefined>;

const TIMEOUT_MS = 8000;

/** Calls a Vent blog endpoint and returns the parsed envelope, or throws an ActionError. */
export async function blogApiFetch<T>(path: string, params: Params = {}, failMessage = 'Unable to fetch blog posts at this time.'): Promise<ApiEnvelope<T>> {
  const url = new URL(path, BLOG_API_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Device-OS': BLOG_API_DEVICE_OS,
        'X-App-Version': BLOG_API_APP_VERSION,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new ActionError({ code: timedOut ? 'GATEWAY_TIMEOUT' : 'BAD_GATEWAY', message: failMessage });
  }

  let body: ApiEnvelope<T> | undefined;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = undefined;
  }

  if (res.ok && body?.status !== false && body) return body;

  switch (res.status) {
    case 422: {
      const fields = body?.errors && !Array.isArray(body.errors) ? Object.values(body.errors).flat() : [];
      throw new ActionError({ code: 'UNPROCESSABLE_CONTENT', message: fields.join(' ') || body?.message || 'Invalid request.' });
    }
    case 404:
      throw new ActionError({ code: 'NOT_FOUND', message: body?.message || 'Not found.' });
    case 429:
      throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'Too many searches. Please wait a moment and try again.' });
    case 400:
      // Missing required headers: a bug on our side, never the user's.
      throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: body?.message ?? 'Bad request to blog API.' });
    default:
      throw new ActionError({ code: 'BAD_GATEWAY', message: body?.message || failMessage });
  }
}

/** The API sends UTC timestamps without a `Z`; add it so they parse as UTC everywhere. */
const asUtc = (iso: string) => (iso && !/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? `${iso}Z` : iso);

export const normalizePost = <T extends BlogPost>(post: T): T => ({
  ...post,
  publishedAt: asUtc(post.publishedAt),
  modifiedAt: asUtc(post.modifiedAt),
});

/** Turns a paginated post envelope into a page with `nextPage` taken from `links.next`. */
export function toPage(body: ApiEnvelope<BlogPost[]>): BlogPostPage {
  const posts = (Array.isArray(body.data) ? body.data : []).map(normalizePost);
  const meta = body.meta ?? {
    current_page: 1, from: null, last_page: 1, path: '', per_page: posts.length, to: null, total: posts.length,
  };
  const next = body.links?.next;
  const nextPageParam = next ? Number(new URL(next).searchParams.get('page')) : NaN;
  const nextPage = posts.length > 0 && Number.isInteger(nextPageParam) && nextPageParam > 0 ? nextPageParam : null;
  return { posts, meta, nextPage };
}
