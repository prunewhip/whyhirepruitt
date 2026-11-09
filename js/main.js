/**
 * whyhirepruitt.dev — shared behaviour for every page
 * Navigation, scroll state, reveal-on-scroll and the cursor spotlight on cards.
 */

(() => {
  'use strict';

  const MOBILE_NAV = window.matchMedia('(max-width: 860px)');

  // Accessible mobile menu: aria-expanded, Esc to close, scroll lock
  function initNav() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.getElementById('nav-links');
    if (!nav || !toggle || !links) return;

    // While the full-screen menu is open, the page behind it is inert so
    // keyboard focus can't wander underneath
    const behind = document.querySelectorAll('main, .site-footer, .skip-link');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      links.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      behind.forEach((el) => { el.inert = open; });
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    MOBILE_NAV.addEventListener('change', (event) => {
      if (!event.matches) setOpen(false);
    });

    // Hairline under the nav once the page has scrolled
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Reveal-on-scroll; content is visible by default without JS (see .js .reveal)
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    items.forEach((el) => observer.observe(el));
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  // Cursor spotlight: cards light up where the pointer is (fine pointers only)
  function initSpotlight() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.card, .principle, .listen, .flow__step, .pipeline__body, .kw-panel').forEach((el) => {
      el.classList.add('spot');
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${event.clientX - r.left}px`);
        el.style.setProperty('--my', `${event.clientY - r.top}px`);
      });
    });
  }

  initNav();
  initReveal();
  initYear();
  initSpotlight();
})();
