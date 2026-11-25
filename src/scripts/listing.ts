/**
 * Post listings backed by the blog API (actions.blog.getPosts).
 * - The server renders the first API page; this script shows PAGE_SIZE at a time and fetches
 *   further API pages on "Load more" as needed.
 * - Home: category tabs swap the feed in place. Each tab's feed is kept, so switching back is instant.
 *   The "All" feed skips posts already shown in the carousel (PRD FR-3.4).
 */
import { actions } from 'astro:actions';
import { toCard, type CategoryRef } from '../lib/blogApi/view';
import { renderCard } from './cards';
import { resetReveal, track } from './reveal';
import { syncButtons } from './ui';

interface ListingState {
  perPage: number;
  pageSize: number;
  /** Category the whole listing is scoped to (category pages), or null for everything. */
  withinId: number | null;
  cats: CategoryRef[];
  /** Post ids the "all" feed should skip (carousel posts on home). */
  exclude: string[];
  nextPage: number | null;
}

interface Feed {
  items: HTMLElement[];
  ids: Set<string>;
  nextPage: number | null;
  shown: number;
}

document.querySelectorAll<HTMLElement>('[data-listing]').forEach((root) => {
  const state: ListingState = JSON.parse(root.querySelector('[data-listing-state]')?.textContent || '{}');
  const grid = root.querySelector<HTMLElement>('[data-reveal]')!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const loadWrap = root.querySelector<HTMLElement>('[data-load-more-wrap]');
  const loadBtn = root.querySelector<HTMLButtonElement>('[data-load-more]');
  const empty = root.querySelector<HTMLElement>('[data-list-empty]');
  const loading = root.querySelector<HTMLElement>('[data-list-loading]');
  const errorBox = root.querySelector<HTMLElement>('[data-list-error]');
  const errorText = root.querySelector<HTMLElement>('[data-list-error-text]');
  const retryBtn = root.querySelector<HTMLButtonElement>('[data-list-retry]');
  const pageSize = state.pageSize || 6;
  const exclude = new Set(state.exclude ?? []);

  const initialItems = [...grid.querySelectorAll<HTMLElement>('[data-item]')];
  const feeds = new Map<string, Feed>([
    [
      'all',
      {
        items: initialItems,
        ids: new Set(initialItems.map((el) => el.dataset.id!)),
        nextPage: state.nextPage,
        shown: pageSize,
      },
    ],
  ]);
  let key = 'all';
  let busy = false;
  let retry: (() => void) | null = null;

  const categoryFor = (k: string) => (k === 'all' ? (state.withinId ?? undefined) : Number(k));

  /** Fetches API pages until the feed holds `need` items or runs out. */
  async function fill(feed: Feed, k: string, need: number) {
    const categoryId = categoryFor(k);
    while (feed.items.length < need && feed.nextPage) {
      const { data, error } = await actions.blog.getPosts({ page: feed.nextPage, perPage: state.perPage, categoryId });
      if (error) throw error;
      for (const post of data.posts) {
        const id = String(post.id);
        // Skip carousel posts on "all", and posts that shifted onto the next page since the last fetch.
        if (feed.ids.has(id) || (k === 'all' && exclude.has(id))) continue;
        const li = renderCard(toCard(post, state.cats, categoryId));
        if (!li) continue;
        li.dataset.untracked = 'true';
        feed.ids.add(id);
        feed.items.push(li);
      }
      feed.nextPage = data.nextPage;
    }
  }

  const render = () => {
    const feed = feeds.get(key);
    if (loading) loading.hidden = !!feed;
    if (!feed) {
      grid.replaceChildren();
      if (loadWrap) loadWrap.hidden = true;
      if (empty) empty.hidden = true;
      return;
    }
    if (grid.children.length !== feed.items.length || feed.items.some((el, i) => grid.children[i] !== el)) {
      grid.replaceChildren(...feed.items);
    }
    feed.items.forEach((el, i) => {
      const show = i < feed.shown;
      if (!show && !el.hidden) resetReveal(el);
      el.hidden = !show;
      if (el.dataset.untracked) {
        delete el.dataset.untracked;
        track(el);
      }
    });
    if (loadWrap) loadWrap.hidden = !(feed.items.length > feed.shown || feed.nextPage);
    if (empty) empty.hidden = feed.items.length > 0 || !!feed.nextPage;
    syncButtons();
  };

  const setBusy = (on: boolean) => {
    busy = on;
    grid.setAttribute('aria-busy', String(on));
    if (loadBtn) {
      loadBtn.disabled = on;
      loadBtn.textContent = on ? 'Loading…' : 'Load more';
    }
  };

  const showError = (err: unknown, again: () => void) => {
    retry = again;
    if (errorText) {
      errorText.textContent =
        err && typeof err === 'object' && 'message' in err && err.message
          ? String(err.message)
          : 'Unable to fetch blog posts at this time.';
    }
    if (errorBox) errorBox.hidden = false;
    if (loading) loading.hidden = true;
  };
  const clearError = () => {
    retry = null;
    if (errorBox) errorBox.hidden = true;
  };

  async function selectTab(next: string) {
    key = next;
    clearError();
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === next)));
    const existing = feeds.get(next);
    if (existing) {
      existing.shown = pageSize;
      render();
      return;
    }
    render(); // shows the loading state
    const feed: Feed = { items: [], ids: new Set(), nextPage: 1, shown: pageSize };
    try {
      await fill(feed, next, pageSize);
      feeds.set(next, feed);
      if (key === next) render();
    } catch (err) {
      if (key === next) showError(err, () => selectTab(next));
    }
  }

  async function loadMore() {
    const feed = feeds.get(key);
    if (!feed || busy) return;
    clearError();
    const firstNew = feed.shown;
    const k = key;
    setBusy(true);
    try {
      await fill(feed, k, firstNew + pageSize);
      feed.shown = firstNew + pageSize;
      if (key === k) {
        render();
        feed.items[firstNew]?.querySelector<HTMLElement>('[data-card-link]')?.focus({ preventScroll: true });
      }
    } catch (err) {
      if (key === k) showError(err, loadMore);
    } finally {
      setBusy(false);
    }
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => tab.dataset.tab !== key && selectTab(tab.dataset.tab!)));
  loadBtn?.addEventListener('click', loadMore);
  retryBtn?.addEventListener('click', () => retry?.());

  if (errorBox && !errorBox.hidden) {
    // The server's first fetch failed: nothing to show yet, Retry refetches the first page.
    feeds.delete('all');
    retry = root.dataset.reloadOnRetry ? () => location.reload() : () => selectTab('all');
    if (loadWrap) loadWrap.hidden = true;
    return;
  }
  render();
});
