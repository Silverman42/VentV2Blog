let timer: number | undefined;
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

export function hideToast() {
  const e = els();
  if (e) e.root.hidden = true;
  undoFn = null;
  window.clearTimeout(timer);
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
  e.root.hidden = false;
  timer = window.setTimeout(hideToast, 4000);
}
