/**
 * Home page behaviour (ES module):
 *   1. the entrance, started once the fonts are in so lines never reflow mid-rise
 *   2. the photoreal hero (js/3d/hero-real.js), loaded after first paint; the still stays until its first frame
 *   3. counters that run up as the stats appear
 *   4. cards that light where the pointer is and tilt toward it (fine pointers, motion allowed)
 *   5. the Linux card's loop, playing only while it's on screen
 *   6. the viewer: one project at a time, with arrows, dots, the arrow keys and swipes
 *   7. the scroll cue, which leaves once you scroll
 */

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const saveData = () => Boolean(navigator.connection && navigator.connection.saveData);
const pad = (n) => String(n).padStart(2, '0');

/* 1. Entrance */
Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 700))])
  .then(() => html.classList.add('is-ready'));

/* 2. Hero */
function initHero() {
  const stage = document.querySelector('[data-hero-stage]');
  const canvas = stage && stage.querySelector('[data-hero-canvas]');
  if (!canvas || !html.classList.contains('has-webgl') || saveData()) return;
  const start = async () => {
    try {
      const { mountHeroReal } = await import('./3d/hero-real.js');
      const hero = await mountHeroReal({ canvas });
      hero.start();
      // Show the live scene once it has drawn a couple of frames
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-live')));
    } catch (error) {
      // The still stays; the page reads the same without 3D
      console.warn('Hero 3D unavailable:', error);
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 300);
}

/* 3. Counters */
function initCounters() {
  const els = [...document.querySelectorAll('[data-count]')];
  if (!els.length || reduced.matches) return;
  const run = (el) => {
    const to = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const t0 = performance.now();
    const dur = 1200;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(to * eased)}${p === 1 ? suffix : ''}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  els.forEach((el) => { el.textContent = '0'; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      // In the hero, wait for the stats to finish fading in
      setTimeout(() => run(entry.target), entry.target.closest('.hx-hero') ? 850 : 0);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* 4. Card light and tilt */
function initCards() {
  if (!finePointer.matches) return;
  document.querySelectorAll('.hx-card__open, .hx-feature').forEach((el) => {
    const tilt = el.classList.contains('hx-card__open');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      if (tilt && !reduced.matches) {
        el.style.setProperty('--rx', `${((0.5 - y / r.height) * 4).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x / r.width - 0.5) * 5).toFixed(2)}deg`);
      }
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

/* 5. The Linux card's loop */
function initCardVideos() {
  if (reduced.matches || saveData()) return;
  document.querySelectorAll('[data-card-video]').forEach((video) => {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!video.getAttribute('src')) video.src = video.dataset.cardVideo;
        video.play().catch(() => {});
      } else if (!video.paused) video.pause();
    }, { threshold: 0.35 }).observe(video);
  });
}

/* 6. The viewer */
function initViewer() {
  const dialog = document.querySelector('[data-viewer]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const openers = [...document.querySelectorAll('[data-open]')];
  const items = openers.map((b) => b.closest('li').querySelector('template'));
  const swap = dialog.querySelector('[data-viewer-swap]');
  const count = dialog.querySelector('[data-viewer-count]');
  const dots = dialog.querySelector('[data-viewer-dots]');
  let current = 0;
  let opener = null;
  let closing = 0;

  items.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Project ${i + 1} of ${items.length}`);
    b.addEventListener('click', () => show(i, i > current ? 1 : -1));
    dots.appendChild(b);
  });

  function show(i, dir = 0) {
    current = (i + items.length) % items.length;
    swap.querySelectorAll('video').forEach((v) => v.pause());
    swap.replaceChildren(items[current].content.cloneNode(true));
    const title = swap.querySelector('.hx-modal__title');
    if (title) title.id = 'hx-modal-title';
    swap.querySelectorAll('video').forEach((v) => {
      if (reduced.matches || saveData()) {
        v.removeAttribute('autoplay');
        v.pause();
      } else v.play().catch(() => {});
    });
    // Links that lead somewhere on this page close the viewer first; a film link also starts the film
    swap.querySelectorAll('[data-close]').forEach((a) => a.addEventListener('click', () => {
      close(false);
      const id = a.dataset.play;
      if (id) setTimeout(() => document.querySelector(`#${id} [data-player-play]`)?.click(), 60);
    }));
    count.textContent = `${pad(current + 1)} / ${pad(items.length)}`;
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', String(k === current)));
    if (dir) {
      swap.style.setProperty('--step', `${dir * 28}px`);
      swap.classList.remove('is-entering');
      void swap.offsetWidth;
      swap.classList.add('is-entering');
    }
  }

  function open(i, from) {
    clearTimeout(closing);
    opener = from;
    dialog.classList.remove('is-closing');
    show(i);
    dialog.showModal();
    html.style.overflow = 'hidden';
  }

  function close(restoreFocus = true) {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    const done = () => {
      dialog.classList.remove('is-closing');
      dialog.close();
      html.style.overflow = '';
      swap.querySelectorAll('video').forEach((v) => v.pause());
      if (restoreFocus && opener) opener.focus();
    };
    if (reduced.matches) return done();
    dialog.classList.add('is-closing');
    closing = setTimeout(done, 220);
  }

  openers.forEach((b, i) => b.addEventListener('click', () => open(i, b)));
  dialog.querySelector('[data-viewer-prev]').addEventListener('click', () => show(current - 1, -1));
  dialog.querySelector('[data-viewer-next]').addEventListener('click', () => show(current + 1, 1));
  dialog.querySelector('[data-viewer-close]').addEventListener('click', () => close());
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // A tap on the dimmed page around the panel closes it
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1, 1);
    else if (e.key === 'ArrowLeft') show(current - 1, -1);
  });
  // Sideways swipes move between projects
  let x0 = null;
  let y0 = 0;
  swap.parentElement.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    x0 = e.clientX;
    y0 = e.clientY;
  });
  swap.parentElement.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  // For the review script: open a given project without a click
  window.__viewer = { open: (i) => open(i, openers[i]), show, close };
}

/* 7. Scroll cue */
function initScrollCue() {
  const onScroll = () => html.classList.toggle('is-scrolled-past', window.scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

initHero();
initCounters();
initCards();
initCardVideos();
initViewer();
initScrollCue();
