/**
 * Light/dark theme switch. The initial class is set by the inline script in BaseLayout's <head>
 * (before paint, no flash); this module handles the header toggle and follows the system setting
 * until the reader picks a theme themselves.
 */
const STORAGE_KEY = 'vent:theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

const stored = (): 'light' | 'dark' | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

function apply(dark: boolean) {
  root.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A131B' : '#FFFFFF');
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', label);
    btn.title = label;
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const dark = !root.classList.contains('dark');
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* storage blocked: the switch still works for this page */
    }
    apply(dark);
  }),
);

media.addEventListener('change', (e) => {
  if (!stored()) apply(e.matches);
});

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) apply(stored() ? stored() === 'dark' : media.matches);
});

apply(root.classList.contains('dark'));

export {};
