/**
 * Hero carousel (PRD FR-1): cross-fade slides, dots, counter, prev/next, arrow keys, swipe,
 * 6s autoplay that pauses on hover/focus/touch and never runs under prefers-reduced-motion.
 */
const AUTOPLAY_MS = 6000;
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const pad = (n: number) => String(n).padStart(2, '0');

document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-dot]')];
  const counter = root.querySelector<HTMLElement>('[data-counter]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const play = root.querySelector<HTMLButtonElement>('[data-play]');
  const titles: string[] = JSON.parse(root.querySelector('[data-titles]')?.textContent || '[]');
  const total = slides.length;
  if (!total) return;

  let current = 0;
  let playing = !reduced;
  let hovering = false;
  let touchX = 0;

  const render = () => {
    slides.forEach((s, i) => {
      const on = i === current;
      s.classList.toggle('opacity-100', on);
      s.classList.toggle('opacity-0', !on);
      s.classList.toggle('pointer-events-none', !on);
      s.setAttribute('aria-hidden', String(!on));
      s.inert = !on;
    });
    dots.forEach((d, i) => {
      const on = i === current;
      d.dataset.active = String(on);
      if (on) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    if (counter) counter.textContent = `${pad(current + 1)} / ${pad(total)}`;
    if (live) {
      live.setAttribute('aria-live', playing ? 'off' : 'polite');
      live.textContent = `Slide ${current + 1} of ${total}: ${titles[current] ?? ''}`;
    }
    if (play) {
      play.dataset.playing = String(playing);
      const label = playing ? 'Pause autoplay' : 'Play autoplay';
      play.setAttribute('aria-label', label);
      play.title = label;
    }
  };

  const go = (i: number) => {
    current = (i + total) % total;
    render();
  };

  window.setInterval(() => {
    if (playing && !hovering && !reduced && !document.hidden) go(current + 1);
  }, AUTOPLAY_MS);

  root.querySelector('[data-prev]')?.addEventListener('click', () => go(current - 1));
  root.querySelector('[data-next]')?.addEventListener('click', () => go(current + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  play?.addEventListener('click', () => {
    playing = !playing;
    render();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });
  root.addEventListener('mouseenter', () => (hovering = true));
  root.addEventListener('mouseleave', () => (hovering = false));
  root.addEventListener('focusin', () => (hovering = true));
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget as Node)) hovering = false;
  });
  root.addEventListener(
    'touchstart',
    (e) => {
      touchX = e.touches[0].clientX;
      hovering = true;
    },
    { passive: true },
  );
  root.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    hovering = false;
  });

  render();
});

export {};
