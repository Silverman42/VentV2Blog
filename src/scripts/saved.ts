/** Saved page: reveals bookmarked posts (most recently saved first) and toggles empty/notice states. */
import { CHANGE_EVENT, getBookmarks, getNotice, initBookmarks } from './bookmarks';

const root = document.querySelector<HTMLElement>('[data-saved-list]');

if (root) {
  const grid = root.querySelector<HTMLElement>('[data-saved-grid]')!;
  const items = [...grid.querySelectorAll<HTMLElement>('[data-item]')];
  const empty = root.querySelector<HTMLElement>('[data-saved-empty]')!;
  const intro = document.querySelector<HTMLElement>('[data-saved-intro]');
  const notice = document.querySelector<HTMLElement>('[data-store-notice]');

  const render = () => {
    const ids = getBookmarks().map((b) => b.id);
    let count = 0;
    items.forEach((el) => {
      const pos = ids.indexOf(el.dataset.id!);
      el.hidden = pos === -1;
      el.style.order = String(pos);
      if (pos !== -1) count++;
    });
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
