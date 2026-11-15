/** Table of contents scroll-spy: highlights the section currently under the sticky header. */
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];

if (links.length) {
  const sections = links
    .map((l) => document.getElementById(l.dataset.tocLink!))
    .filter((el): el is HTMLElement => !!el);
  let active = '';

  const update = () => {
    let cur = sections[0]?.id ?? '';
    for (const s of sections) if (s.getBoundingClientRect().top < 140) cur = s.id;
    if (cur === active) return;
    active = cur;
    links.forEach((l) => {
      const on = l.dataset.tocLink === cur;
      l.dataset.active = String(on);
      if (on) l.setAttribute('aria-current', 'location');
      else l.removeAttribute('aria-current');
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

export {};
