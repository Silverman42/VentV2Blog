/**
 * Staggered slide-up reveal for post grids ([data-reveal] > [data-item]).
 * Cards that scroll into view together are revealed one after another; the hidden start state
 * lives in global.css and only applies when scripting is on and motion isn't reduced.
 */
const STAGGER_MS = 80;
const MAX_STEPS = 5;
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const reveal = (el: HTMLElement) => el.setAttribute('data-revealed', 'true');

const observer =
  reduced || !('IntersectionObserver' in window)
    ? null
    : new IntersectionObserver(
        (entries) => {
          let step = 0;
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            el.style.transitionDelay = `${Math.min(step++, MAX_STEPS) * STAGGER_MS}ms`;
            reveal(el);
            observer!.unobserve(el);
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      );

export const track = (el: HTMLElement) => (observer ? observer.observe(el) : reveal(el));

/** Hide a card again so it re-animates the next time it becomes visible. */
export function resetReveal(el: HTMLElement) {
  if (!observer || !el.hasAttribute('data-revealed')) return;
  el.removeAttribute('data-revealed');
  el.style.transitionDelay = '';
  observer.observe(el);
}

document.querySelectorAll<HTMLElement>('[data-reveal] > [data-item]').forEach(track);
