/** Category drawer: open/close, Escape, overlay click, focus return. */
const root = document.querySelector<HTMLElement>('[data-drawer]');
const panel = document.getElementById('category-drawer');
const toggles = document.querySelectorAll<HTMLButtonElement>('[data-drawer-open]');
let opener: HTMLElement | null = null;

function setOpen(open: boolean) {
  if (!root || !panel) return;
  root.dataset.open = String(open);
  panel.setAttribute('aria-hidden', String(!open));
  panel.inert = !open;
  toggles.forEach((t) => t.setAttribute('aria-expanded', String(open)));
  if (open) {
    opener = document.activeElement as HTMLElement | null;
    window.setTimeout(() => panel.querySelector<HTMLElement>('[data-drawer-close]:not(div)')?.focus(), 60);
  } else {
    opener?.focus();
  }
}

toggles.forEach((t) => t.addEventListener('click', () => setOpen(root?.dataset.open !== 'true')));
root?.querySelectorAll('[data-drawer-close]').forEach((el) => el.addEventListener('click', () => setOpen(false)));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && root?.dataset.open === 'true') setOpen(false);
});
window.addEventListener('vent:close-overlays', () => {
  if (root?.dataset.open === 'true') setOpen(false);
});

export {};
