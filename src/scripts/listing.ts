/**
 * Post listings: in-place category filtering (home) and "Load more" pagination (home + category).
 */
document.querySelectorAll<HTMLElement>('[data-listing]').forEach((root) => {
  const pageSize = Number(root.dataset.pageSize) || 6;
  const isHome = root.dataset.mode === 'home';
  const items = [...root.querySelectorAll<HTMLElement>('[data-item]')];
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const loadWrap = root.querySelector<HTMLElement>('[data-load-more-wrap]');
  const loadBtn = root.querySelector<HTMLButtonElement>('[data-load-more]');
  const empty = root.querySelector<HTMLElement>('[data-list-empty]');

  let cat = 'all';
  let shown = pageSize;

  const pool = () =>
    items.filter((el) =>
      cat === 'all' ? !(isHome && el.dataset.latest === 'true') : el.dataset.cat === cat,
    );

  const render = () => {
    const visible = new Set(pool().slice(0, shown));
    const total = pool().length;
    items.forEach((el) => (el.hidden = !visible.has(el)));
    if (loadWrap) loadWrap.hidden = total <= shown;
    if (empty) empty.hidden = total > 0;
  };

  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      cat = tab.dataset.tab!;
      shown = pageSize;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      render();
    }),
  );

  loadBtn?.addEventListener('click', () => {
    const firstNew = pool()[shown];
    shown += pageSize;
    render();
    firstNew?.querySelector<HTMLElement>('[data-card-link]')?.focus({ preventScroll: true });
  });

  render();
});

export {};
