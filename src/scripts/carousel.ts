/**
 * Hero carousel (PRD FR-1): images slide horizontally while the text panel fades; dots, counter,
 * prev/next, arrow keys, swipe, 6s autoplay that pauses on hover/focus/touch and never runs under
 * prefers-reduced-motion (where global CSS also makes the transitions instant).
 */
const AUTOPLAY_MS = 6000;
const SLIDE_MS = 700;
const TEXT_OUT_MS = 250;
const TEXT_IN_MS = 450;
const TEXT_IN_DELAY_MS = 200;
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

  const media = slides.map((s) => s.querySelector<HTMLElement>('[data-slide-media]'));
  const text = slides.map((s) => s.querySelector<HTMLElement>('[data-slide-text]'));

  let current = 0;
  let previous = 0;
  let direction = 1;
  let playing = !reduced;
  let hovering = false;
  let touchX = 0;

  const SLIDE = `transform ${SLIDE_MS}ms var(--ease-out-expo)`;

  /** Images slide in from the side we're heading towards; the text panel fades out, then the new one fades in. */
  const animate = () => {
    slides.forEach((_, i) => {
      const m = media[i];
      const t = text[i];
      if (m) {
        if (i === current && i !== previous) {
          m.style.transition = 'none';
          m.style.transform = `translateX(${direction * 100}%)`;
          void m.offsetWidth; // commit the start position before animating
          m.style.transition = SLIDE;
          m.style.transform = 'translateX(0)';
        } else if (i === previous && i !== current) {
          m.style.transition = SLIDE;
          m.style.transform = `translateX(${-direction * 100}%)`;
        } else if (i !== current) {
          m.style.transition = 'none';
          m.style.transform = 'translateX(100%)';
        }
      }
      if (t) {
        const on = i === current;
        t.style.transitionDuration = on ? `${TEXT_IN_MS}ms` : `${TEXT_OUT_MS}ms`;
        t.style.transitionDelay = on ? `${TEXT_IN_DELAY_MS}ms` : '0ms';
        t.classList.toggle('opacity-100', on);
        t.classList.toggle('opacity-0', !on);
      }
    });
  };

  const render = () => {
    animate();
    slides.forEach((s, i) => {
      const on = i === current;
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

  /** dir: +1 = forward (slides in from the right), -1 = back. Defaults to the sign of the jump. */
  const go = (i: number, dir = Math.sign(i - current) || 1) => {
    const next = (i + total) % total;
    if (next === current) return;
    previous = current;
    current = next;
    direction = dir;
    render();
  };
  const step = (dir: 1 | -1) => go(current + dir, dir);

  window.setInterval(() => {
    if (playing && !hovering && !reduced && !document.hidden) step(1);
  }, AUTOPLAY_MS);

  root.querySelector('[data-prev]')?.addEventListener('click', () => step(-1));
  root.querySelector('[data-next]')?.addEventListener('click', () => step(1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  play?.addEventListener('click', () => {
    playing = !playing;
    render();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
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
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    hovering = false;
  });

  render();
});

export {};
