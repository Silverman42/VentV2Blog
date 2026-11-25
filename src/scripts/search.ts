/**
 * Search dialog backed by the blog API.
 * - Empty (or 1-character) query: latest stories via actions.blog.getPosts, cached per chip.
 * - Otherwise: actions.blog.searchPosts after a debounce (the API allows 60 searches a minute).
 * Category chips scope both to a top-level category and its subcategories.
 */
import { actions } from 'astro:actions';
import { toCard, type CardPost, type CategoryRef } from '../lib/blogApi/view';

const DEBOUNCE_MS = 350;
const RESULT_LIMIT = 8;
const MIN_QUERY = 2;

const root = document.querySelector<HTMLElement>('[data-search]');

if (root) {
  const panel = root.querySelector<HTMLElement>('[data-search-panel]')!;
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!;
  const label = root.querySelector<HTMLElement>('[data-search-label]')!;
  const results = root.querySelector<HTMLUListElement>('[data-search-results]')!;
  const empty = root.querySelector<HTMLElement>('[data-search-empty]')!;
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-scat]');
  const cats: CategoryRef[] = JSON.parse(root.querySelector('[data-search-cats]')?.textContent || '[]');
  const latestCache = new Map<string, CardPost[]>();
  let scat = 'all';
  let opener: HTMLElement | null = null;
  let timer: number | undefined;
  let seq = 0;

  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;

  const categoryId = () => (scat === 'all' ? undefined : Number(scat));
  const query = () => input.value.trim().replace(/\s+/g, ' ');

  const showMessage = (text: string) => {
    results.replaceChildren();
    empty.hidden = false;
    empty.textContent = text;
  };

  const errorText = (err: { code?: string; message?: string }) =>
    err.code === 'TOO_MANY_REQUESTS'
      ? 'Too many searches. Please wait a moment and try again.'
      : err.message || 'Unable to search right now. Please try again.';

  /** Fetches and renders for the current query and chip, ignoring responses that arrive out of order. */
  const run = async () => {
    const id = ++seq;
    const q = query();
    const cid = categoryId();
    results.setAttribute('aria-busy', 'true');

    if (q.length < MIN_QUERY) {
      let cards = latestCache.get(scat);
      label.textContent = cards ? 'LATEST STORIES' : 'LOADING…';
      if (!cards) {
        const { data, error } = await actions.blog.getPosts({ perPage: RESULT_LIMIT, categoryId: cid });
        if (id !== seq) return;
        results.removeAttribute('aria-busy');
        if (error) return showMessage(errorText(error));
        cards = data.posts.map((p) => toCard(p, cats, cid));
        latestCache.set(scat, cards);
        label.textContent = 'LATEST STORIES';
      }
      results.removeAttribute('aria-busy');
      return render(cards, 'No stories in this category yet.');
    }

    label.textContent = 'SEARCHING…';
    const { data, error } = await actions.blog.searchPosts({ query: q, perPage: RESULT_LIMIT, categoryId: cid });
    if (id !== seq) return;
    results.removeAttribute('aria-busy');
    if (error) {
      label.textContent = 'RESULTS';
      return showMessage(errorText(error));
    }
    const total = data.meta.total;
    label.textContent = `${total} ${total === 1 ? 'RESULT' : 'RESULTS'}`;
    render(
      data.posts.map((p) => toCard(p, cats, cid)),
      `No stories match “${q}”. Try another word or category.`,
    );
  };

  const schedule = (delay = DEBOUNCE_MS) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const id = seq + 1;
      run().catch(() => {
        // Network failure before the action could answer.
        if (id !== seq) return;
        results.removeAttribute('aria-busy');
        showMessage('Unable to search right now. Please try again.');
      });
    }, delay);
  };

  const render = (hits: CardPost[], emptyText: string) => {
    results.replaceChildren(
      ...hits.slice(0, RESULT_LIMIT).map((p) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = p.url;
        a.className =
          'flex flex-col gap-1.5 rounded-2xl border border-transparent p-3 no-underline hover:border-brand-100 hover:bg-brand-100';
        const t = document.createElement('span');
        t.className = 'text-[17px] leading-[1.3] font-semibold text-ink-900';
        t.textContent = p.title;
        const m = document.createElement('span');
        m.className = 'text-sm leading-[1.4] font-medium text-ink-600';
        m.textContent = [p.category, p.date, p.author].filter(Boolean).join(' · ');
        a.append(t, m);
        li.append(a);
        return li;
      }),
    );
    empty.hidden = hits.length > 0;
    if (!hits.length) empty.textContent = emptyText;
  };

  const setOpen = (open: boolean) => {
    root.dataset.open = String(open);
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (open) {
      opener = document.activeElement as HTMLElement | null;
      window.dispatchEvent(new Event('vent:close-overlays'));
      schedule(0);
      window.setTimeout(() => input.focus(), 60);
    } else {
      opener?.focus();
    }
  };

  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', () => setOpen(true)));
  root.querySelector('[data-search-close]')!.addEventListener('click', () => setOpen(false));
  root.addEventListener('click', (e) => {
    if (e.target === root) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.dataset.open === 'true') setOpen(false);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOpen(root.dataset.open !== 'true');
    }
  });
  input.addEventListener('input', () => schedule());
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      scat = chip.dataset.scat!;
      chips.forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
      schedule(0);
    }),
  );
}

