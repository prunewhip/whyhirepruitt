/**
 * Home page behaviour (ES module):
 *   1. the entrance, started once the fonts are in so lines never reflow mid-rise
 *   2. the hero: the path-traced glasses (tools/render/g1.py) lean toward the pointer, and the turntable takes over
 *      from the still once it can play (never with reduced motion or data saver)
 *   3. counters that run up as the stats appear
 *   4. what I've built: a deck of four cards that lean toward the pointer, turn in as they change and page
 *      through on their own, slowly, until someone takes over
 *   5. the short films: one dialog, and nothing plays until someone asks
 *   6. the "More" sheets, one per card
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
  const drift = document.querySelector('[data-shot-drift]');
  if (!drift || reduced.matches) return;

  // The turntable: a 10-second, seamless 360° loop, loaded after the page has settled
  const video = drift.querySelector('video[data-src]');
  if (video && !saveData()) {
    const start = () => {
      video.src = video.dataset.src;
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
      video.play().catch(() => {});
    };
    if (document.readyState === 'complete') setTimeout(start, 1200);
    else addEventListener('load', () => setTimeout(start, 1200), { once: true });
    // Off screen, it rests
    new IntersectionObserver(([entry]) => {
      if (!video.getAttribute('src')) return;
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }).observe(video);
  }

  // The photograph leans a few pixels toward the pointer (damped, fine pointers only)
  if (!finePointer.matches) return;
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let raf = 0;
  const step = () => {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    drift.style.setProperty('--px', `${x.toFixed(2)}px`);
    drift.style.setProperty('--py', `${y.toFixed(2)}px`);
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth - 0.5) * -14;
    ty = (e.clientY / innerHeight - 0.5) * -10;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
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

/* 4. What I've built: the deck. Tabs over one card at a time, with arrows, arrow keys and swipes. The card leans
   toward the pointer and catches the light; a new one turns in from the side it came from; and the deck pages through
   on its own, slowly, resting while someone points at it, reads a "More" sheet or watches a film, and never at all
   with reduced motion. The pause button stops it for good. */
const pauses = new Set();
let onPause = () => {};
const setPause = (reason, on) => {
  if (on) pauses.add(reason);
  else pauses.delete(reason);
  onPause();
};

function initDeck() {
  const root = document.querySelector('[data-deck]');
  if (!root) return;
  const list = root.querySelector('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  const stage = root.querySelector('[data-strip-stage]');
  const count = root.querySelector('[data-strip-count]');
  const bar = root.querySelector('[data-strip-bar]');
  const pauseButton = root.querySelector('[data-deck-pause]');
  const auto = !reduced.matches;
  root.style.setProperty('--n', tabs.length);
  let current = 0;
  let inView = false;

  // The Vox film plays muted inside its card while the card shows and is on screen; with reduced motion or data
  // saver it waits for a tap on its own controls
  const films = panels.map((panel) => panel.querySelector('video[data-src]'));
  const still = reduced.matches || saveData();
  films.forEach((video) => { if (video && still) { video.src = video.dataset.src; video.controls = true; } });
  const syncFilms = () => films.forEach((video, i) => {
    if (!video || still) return;
    if (i === current && inView) {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {});
    } else if (video.getAttribute('src')) video.pause();
  });

  function select(next, { focus = false } = {}) {
    next = (next + tabs.length) % tabs.length;
    if (next === current) return;
    const dir = next > current || (current === tabs.length - 1 && next === 0) ? 1 : -1;
    current = next;
    root.style.setProperty('--dwell', `${panels[next].dataset.dwell || 9}s`);
    tabs.forEach((tab, i) => {
      const on = i === next;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    const panel = panels[next];
    panel.style.setProperty('--from', `${24 * dir}px`);
    panel.style.setProperty('--flip', dir);
    panel.classList.remove('is-entering');
    root.classList.remove('is-sweeping');
    void panel.offsetWidth;
    panel.classList.add('is-entering');
    root.classList.add('is-sweeping');
    count.textContent = `${pad(next + 1)} / ${pad(tabs.length)}`;
    bar.style.transform = `translateX(${next * 100}%)`;
    const film = films[next];
    if (film && film.getAttribute('src') && !still) film.currentTime = 0;
    syncFilms();
    // Keep the chosen thumbnail in view inside the strip, without moving the page
    const tab = tabs[next];
    const left = tab.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: left - 16, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  root.querySelector('[data-strip-prev]').addEventListener('click', () => select(current - 1));
  root.querySelector('[data-strip-next]').addEventListener('click', () => select(current + 1));
  list.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select(keys[e.key], { focus: true });
  });

  // A sideways swipe on the card moves to the next or previous one
  let x0 = null;
  let y0 = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    x0 = e.clientX;
    y0 = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { x0 = null; });

  // On screen or off: the film and the countdown only run while someone can see them
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setPause('view', !inView);
    syncFilms();
    // Once the deck is near, fetch every card's picture, so none turns in blank
    if (inView) panels.forEach((panel) => panel.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; }));
  }, { threshold: 0.2 }).observe(stage);

  // The slow page-through: each thumbnail's bar counts down (CSS), and when it fills, the next card comes
  if (auto) {
    root.classList.add('is-auto');
    root.style.setProperty('--dwell', `${panels[0].dataset.dwell || 9}s`);
    onPause = () => {
      root.classList.toggle('is-paused', pauses.size > 0);
      root.dataset.resting = [...pauses].join(' ');
    };
    onPause();
    tabs.forEach((tab) => tab.querySelector('.hx-tab__time').addEventListener('animationend', () => {
      if (tab.getAttribute('aria-selected') === 'true') select(current + 1);
    }));
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPause('hover', true); });
    root.addEventListener('pointerleave', () => setPause('hover', false));
    root.addEventListener('focusin', (e) => setPause('focus', e.target.matches(':focus-visible')));
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) setPause('focus', false); });
    document.addEventListener('visibilitychange', () => setPause('tab', document.hidden));
    pauseButton.addEventListener('click', () => {
      const off = pauseButton.getAttribute('aria-pressed') !== 'true';
      pauseButton.setAttribute('aria-pressed', String(off));
      pauseButton.setAttribute('aria-label', off ? 'Play the cards' : 'Pause the cards');
      setPause('user', off);
    });
  }

  // The lean and the light: fine pointers only, damped so it glides
  if (reduced.matches || !finePointer.matches) return;
  let tx = 0;
  let ty = 0;
  let rx = 0;
  let ry = 0;
  let mx = 30;
  let my = 0;
  let tmx = 30;
  let tmy = 0;
  let raf = 0;
  const step = () => {
    rx += (tx - rx) * 0.1;
    ry += (ty - ry) * 0.1;
    mx += (tmx - mx) * 0.14;
    my += (tmy - my) * 0.14;
    stage.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    stage.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    stage.style.setProperty('--mx', `${mx.toFixed(1)}%`);
    stage.style.setProperty('--my', `${my.toFixed(1)}%`);
    stage.style.setProperty('--ang', `${(Math.atan2(my - 50, mx - 50) * 180 / Math.PI + 270).toFixed(0)}deg`);
    const moving = Math.abs(tx - rx) + Math.abs(ty - ry) + Math.abs(tmx - mx) + Math.abs(tmy - my) > 0.05;
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tx = (0.5 - py) * 5;
    ty = (px - 0.5) * 7;
    tmx = px * 100;
    tmy = py * 100;
    stage.style.setProperty('--shine', '1');
    kick();
  });
  stage.addEventListener('pointerleave', () => {
    tx = 0;
    ty = 0;
    tmx = 30;
    tmy = 0;
    stage.style.setProperty('--shine', '0.55');
    kick();
  });
}

/* 5. The short films (tools/film/shorts.html): square, with music, and only when asked */
const SHORTS = {
  learn: {
    title: 'Learn anything · 0:24 · an example session',
    words: 'Learn anything: any subject, your voice, your level. Your new job, explained: the employee handbook, now with a plot. Lost? Ask: don’t get it? Ask, right then and there. A quiz on the drive home: answer out loud, it sticks.'
  },
  build: {
    title: 'Build anywhere · 0:24 · an example session',
    words: 'Build anywhere: your computer at home, one look away. Or at work: your work computer, same glance. Or no computer at all: the terminal on your phone, always waiting. Heads-up: check in only when it counts.'
  },
  remember: {
    title: 'Forget nothing · 0:24 · people and conversations are examples',
    words: 'Forget nothing: it listens on your phone, only there. Ask about your day: what you heard, when you need it. Then ask about yourself: the voice you hear most is yours. In your glasses: on the tip of your tongue? Now it’s on the tip of your nose.'
  }
};

// While any sheet or film is open, the page behind it holds still and the deck rests
const syncLock = () => {
  const open = document.querySelector('dialog[open]');
  html.style.overflow = open ? 'hidden' : '';
  setPause('dialog', Boolean(open));
};

function initShorts() {
  const dialog = document.querySelector('[data-reel]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const video = dialog.querySelector('video');
  const title = dialog.querySelector('[data-reel-title]');
  const words = dialog.querySelector('[data-reel-words]');
  let opener = null;

  document.querySelectorAll('[data-short]').forEach((button) => button.addEventListener('click', () => {
    const name = button.dataset.short;
    const film = SHORTS[name];
    if (!film) return;
    opener = button;
    video.poster = `assets/video/short-${name}-poster.webp`;
    video.src = `assets/video/short-${name}.mp4`;
    title.textContent = film.title;
    words.textContent = `Words on screen, with music: ${film.words}`;
    dialog.showModal();
    syncLock();
    video.play().catch(() => {});
  }));

  const close = () => dialog.close();
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    syncLock();
    if (opener) opener.focus();
  });
  dialog.querySelector('[data-reel-close]').addEventListener('click', close);
  // A tap on the dimmed page around the film closes it
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
}

/* 6. More: a sheet per card, with the whole story; it opens only when asked */
function initMore() {
  document.querySelectorAll('[data-more]').forEach((button) => {
    const dialog = document.getElementById(button.dataset.more);
    if (!dialog || typeof dialog.showModal !== 'function') return;
    button.addEventListener('click', () => {
      dialog.showModal();
      dialog.scrollTop = 0;
      syncLock();
    });
    if (dialog.dataset.wired) return;
    dialog.dataset.wired = '1';
    dialog.querySelector('[data-more-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      syncLock();
      button.focus();
    });
  });
}

/* 7. Scroll cue */
function initScrollCue() {
  const onScroll = () => html.classList.toggle('is-scrolled-past', window.scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

initHero();
initCounters();
initDeck();
initShorts();
initMore();
initScrollCue();
