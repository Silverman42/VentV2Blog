/**
 * Global UI wiring loaded by BaseLayout:
 * bookmark buttons, header Saved count, toast, copy-link.
 */
import {
  CHANGE_EVENT,
  initBookmarks,
  isSaved,
  setBookmarks,
  toggleBookmark,
  getBookmarks,
  type BookmarkInput,
} from './bookmarks';
import { showToast } from './toast';

function syncButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-bookmark]').forEach((btn) => {
    const { id } = JSON.parse(btn.dataset.bookmark!) as BookmarkInput;
    const saved = isSaved(id);
    btn.setAttribute('aria-pressed', String(saved));
    const label = saved ? 'Remove from saved' : 'Save post';
    if (btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', label);
    if (btn.hasAttribute('title')) btn.setAttribute('title', label);
    const text = btn.querySelector<HTMLElement>('[data-save-text]');
    if (text) text.textContent = saved ? 'Saved' : 'Save';
  });
}

function syncCount() {
  const n = getBookmarks().length;
  document.querySelectorAll<HTMLElement>('[data-saved-count]').forEach((el) => {
    el.textContent = String(n);
    el.setAttribute('aria-label', `${n} saved ${n === 1 ? 'post' : 'posts'}`);
  });
}

window.addEventListener(CHANGE_EVENT, () => {
  syncButtons();
  syncCount();
});

document.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;

  const bm = target.closest<HTMLButtonElement>('[data-bookmark]');
  if (bm) {
    e.preventDefault();
    e.stopPropagation();
    await initBookmarks();
    const result = toggleBookmark(JSON.parse(bm.dataset.bookmark!));
    if (result.status === 'limit') {
      showToast('You’ve reached 200 saved posts — remove some to add more');
    } else {
      const prev = result.previous;
      showToast(result.status === 'added' ? 'Saved' : 'Removed from saved', () => setBookmarks(prev));
    }
    return;
  }

  const copy = target.closest<HTMLButtonElement>('[data-copy-link]');
  if (copy) {
    try {
      await navigator.clipboard?.writeText(copy.dataset.copyLink!);
    } catch {
      /* clipboard can be blocked; the toast still confirms the intent */
    }
    showToast('Link copied');
  }
});

initBookmarks();
