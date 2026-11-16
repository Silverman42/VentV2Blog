/** Matches the toast's CSS transition; also the fallback when transitionend doesn't fire (reduced motion). */
const SLIDE_MS = 350;

let timer: number | undefined;
let hideTimer: number | undefined;
let undoFn: (() => void) | null = null;
let wired = false;

function els() {
  const root = document.querySelector<HTMLElement>('[data-toast]');
  if (!root) return null;
  return {
    root,
    msg: root.querySelector<HTMLElement>('[data-toast-msg]')!,
    undo: root.querySelector<HTMLButtonElement>('[data-toast-undo]')!,
    spacer: root.querySelector<HTMLElement>('[data-toast-spacer]')!,
  };
}

/** Slides the toast back down, then takes it out of the layout/accessibility tree. */
export function hideToast() {
  const e = els();
  undoFn = null;
  window.clearTimeout(timer);
  if (!e || e.root.hidden || e.root.dataset.open !== 'true') return;
  e.root.dataset.open = 'false';
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (e.root.dataset.open !== 'true') e.root.hidden = true;
  }, SLIDE_MS);
}

export function showToast(message: string, undo: (() => void) | null = null) {
  const e = els();
  if (!e) return;
  if (!wired) {
    wired = true;
    e.undo.addEventListener('click', () => {
      const fn = undoFn;
      hideToast();
      fn?.();
    });
  }
  window.clearTimeout(timer);
  undoFn = undo;
  e.msg.textContent = message;
  e.undo.hidden = !undo;
  e.spacer.hidden = !!undo;
  window.clearTimeout(hideTimer);
  if (e.root.hidden) {
    // Start from the off-screen position, commit it, then slide up.
    e.root.dataset.open = 'false';
    e.root.hidden = false;
    void e.root.offsetHeight;
  }
  e.root.dataset.open = 'true';
  timer = window.setTimeout(hideToast, 4000);
}
