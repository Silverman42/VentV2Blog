/**
 * Theme switch: Light / Dark / System.
 * The initial `dark` class is set by the inline script in BaseLayout's <head> (before paint, no flash);
 * this module wires the header controls (ThemeSwitch.astro) and follows the OS setting in System mode.
 * Storage: `vent:theme` = 'light' | 'dark'; no value means System.
 */
type Mode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'vent:theme';
const ORDER: Mode[] = ['light', 'dark', 'system'];
const LABELS: Record<Mode, string> = { light: 'Light', dark: 'Dark', system: 'Match system' };

const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');
const options = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-option]')];
const cycles = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-cycle]')];

function readMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function saveMode(mode: Mode) {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage blocked: the choice still applies to this page */
  }
}

let current: Mode = readMode();

function applyMode(mode: Mode) {
  current = mode;
  const dark = mode === 'dark' || (mode === 'system' && media.matches);
  root.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A131B' : '#FFFFFF');

  options.forEach((btn) => {
    const on = btn.dataset.themeOption === mode;
    btn.setAttribute('aria-checked', String(on));
    btn.tabIndex = on ? 0 : -1;
  });

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  cycles.forEach((btn) => {
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', `Theme: ${LABELS[mode]}. Switch to ${LABELS[next]}`);
    btn.title = `Theme: ${LABELS[mode]}`;
  });
}

function choose(mode: Mode) {
  saveMode(mode);
  applyMode(mode);
}

options.forEach((btn) => {
  btn.addEventListener('click', () => choose(btn.dataset.themeOption as Mode));
  // Radiogroup keyboard pattern: arrows move and select, the group is a single Tab stop.
  btn.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = ORDER.indexOf(btn.dataset.themeOption as Mode);
    const mode = ORDER[(i + step + ORDER.length) % ORDER.length];
    choose(mode);
    options.find((o) => o.dataset.themeOption === mode)?.focus();
  });
});

cycles.forEach((btn) =>
  btn.addEventListener('click', () => choose(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])),
);

media.addEventListener('change', () => {
  if (current === 'system') applyMode('system');
});

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY || e.key === null) applyMode(readMode());
});

applyMode(current);

export {};
