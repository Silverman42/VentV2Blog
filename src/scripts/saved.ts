/** Saved page: renders bookmarked posts (most recently saved first) and toggles empty/notice states. */
import { postPath, type CardPost } from '../lib/blogApi/view';
import { CHANGE_EVENT, getBookmarks, getNotice, initBookmarks, type Bookmark } from './bookmarks';
import { renderCard } from './cards';
import { track } from './reveal';
import { syncButtons } from './ui';

const toCard = (b: Bookmark): CardPost => ({
  id: b.id,
  slug: b.slug,
  url: postPath(b.slug),
  title: b.title,
  excerpt: b.excerpt ?? '',
  cat: b.cat ?? '',
  category: b.category,
  iso: '',
  date: '',
  // `cover-{id}` marks a post without a cover image.
  coverImage: b.coverImage && !b.coverImage.startsWith('cover-') ? b.coverImage : undefined,
  coverAlt: b.title,
});

const root = document.querySelector<HTMLElement>('[data-saved-list]');

if (root) {
  const grid = root.querySelector<HTMLElement>('[data-saved-grid]')!;
  const empty = root.querySelector<HTMLElement>('[data-saved-empty]')!;
  const intro = document.querySelector<HTMLElement>('[data-saved-intro]');
  const notice = document.querySelector<HTMLElement>('[data-store-notice]');
  /** Rendered cards by post id, so re-renders keep existing cards (and their reveal state). */
  const cards = new Map<string, HTMLElement>();

  const render = () => {
    const fresh: HTMLElement[] = [];
    const items = getBookmarks()
      .filter((b) => b.slug)
      .map((b) => {
        let li = cards.get(b.id);
        if (!li) {
          li = renderCard(toCard(b)) ?? undefined;
          if (!li) return null;
          cards.set(b.id, li);
          fresh.push(li);
        }
        return li;
      })
      .filter((el): el is HTMLElement => !!el);
    grid.replaceChildren(...items);
    fresh.forEach(track);
    syncButtons();
    const count = items.length;
    grid.hidden = count === 0;
    empty.hidden = count > 0;
    if (intro) {
      intro.textContent = count
        ? `${count} ${count === 1 ? 'story' : 'stories'} saved on this device. Your list is encrypted and never leaves your browser.`
        : 'Your list is encrypted and stays on this device — no account needed.';
    }
    const msg = getNotice();
    if (notice) {
      notice.hidden = !msg;
      notice.textContent = msg ?? '';
    }
  };

  window.addEventListener(CHANGE_EVENT, render);
  initBookmarks().then(render);
}
