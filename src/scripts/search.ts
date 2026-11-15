/** Search dialog: filters an inlined JSON index of posts by text and category. */
interface Entry {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  author: string;
  cat: string;
  category: string;
  date: string;
}

const root = document.querySelector<HTMLElement>('[data-search]');

if (root) {
  const panel = root.querySelector<HTMLElement>('[data-search-panel]')!;
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!;
  const label = root.querySelector<HTMLElement>('[data-search-label]')!;
  const results = root.querySelector<HTMLUListElement>('[data-search-results]')!;
  const empty = root.querySelector<HTMLElement>('[data-search-empty]')!;
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-scat]');
  const index: Entry[] = JSON.parse(root.querySelector('[data-search-index]')!.textContent || '[]');
  let scat = 'all';
  let opener: HTMLElement | null = null;

  panel.setAttribute('aria-hidden', 'true');
  panel.inert = true;

  const render = () => {
    const q = input.value.trim().toLowerCase();
    const hits = index.filter(
      (p) =>
        (scat === 'all' || p.cat === scat) &&
        (!q || `${p.title} ${p.excerpt} ${p.author}`.toLowerCase().includes(q)),
    );
    label.textContent = q ? `${hits.length} ${hits.length === 1 ? 'RESULT' : 'RESULTS'}` : 'LATEST STORIES';
    results.replaceChildren(
      ...hits.slice(0, 8).map((p) => {
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
        m.textContent = `${p.category} · ${p.date} · ${p.author}`;
        a.append(t, m);
        li.append(a);
        return li;
      }),
    );
    empty.hidden = hits.length > 0;
    if (!hits.length) empty.textContent = `No stories match “${input.value.trim()}”. Try another word or category.`;
  };

  const setOpen = (open: boolean) => {
    root.dataset.open = String(open);
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (open) {
      opener = document.activeElement as HTMLElement | null;
      window.dispatchEvent(new Event('vent:close-overlays'));
      render();
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
  input.addEventListener('input', render);
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      scat = chip.dataset.scat!;
      chips.forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
      render();
    }),
  );
}

export {};
