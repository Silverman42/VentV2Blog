/** Builds post card <li> elements in the browser from the templates in CardTemplates.astro. */
import type { CardPost } from '../lib/blogApi/view';

const template = (kind: 'cover' | 'placeholder') =>
  document.querySelector<HTMLTemplateElement>(`template[data-card-template="${kind}"]`);

export function renderCard(card: CardPost): HTMLLIElement | null {
  const tpl = template(card.coverImage ? 'cover' : 'placeholder');
  const li = tpl?.content.firstElementChild?.cloneNode(true) as HTMLLIElement | undefined;
  if (!li) return null;

  li.dataset.id = card.id;
  li.dataset.cat = card.cat;

  const q = <T extends HTMLElement>(slot: string) => li.querySelector<T>(`[data-slot="${slot}"]`);

  const category = q<HTMLAnchorElement>('category');
  if (category) {
    category.href = card.cat ? `/category/${card.cat}` : '/';
    category.textContent = card.category;
  }
  const date = q<HTMLTimeElement>('date');
  if (date) {
    date.dateTime = card.iso;
    date.textContent = card.date;
    date.hidden = !card.date;
  }
  const title = q<HTMLAnchorElement>('title');
  if (title) {
    title.href = card.url;
    title.textContent = card.title;
  }
  const excerpt = q('excerpt');
  if (excerpt) excerpt.textContent = card.excerpt;

  const cover = q('cover');
  const img = cover?.querySelector('img');
  if (img && card.coverImage) {
    img.src = card.coverImage;
    img.alt = card.coverAlt ?? card.title;
  }
  cover?.querySelector('[role="img"]')?.setAttribute('aria-label', card.coverAlt ?? card.title);

  const bookmark = li.querySelector<HTMLButtonElement>('[data-bookmark]');
  if (bookmark) {
    bookmark.dataset.bookmark = JSON.stringify({
      id: card.id,
      slug: card.slug,
      title: card.title,
      category: card.category,
      cat: card.cat,
      excerpt: card.excerpt,
      coverImage: card.coverImage ?? `cover-${card.id}`,
    });
  }
  return li;
}
