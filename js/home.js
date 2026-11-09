/**
 * Home and "Other apps" behaviour (ES module)
 *   1. 3D scenes, each loaded only where WebGL is available and only as it nears the screen:
 *      the phone and glasses under "The idea", and a turning device for each app
 *   2. Case studies and the on-page rail: what's in view is marked, so you always know where you are
 *   3. Sample podcast player with chapters
 */

const SCREENS = {
  vox: ['assets/app/hd/vox-now.webp', 'assets/app/hd/vox-conversation.webp', 'assets/app/hd/vox-ask.webp'],
  narrator: ['assets/app/hd/narr-reader.webp', 'assets/app/hd/narr-library.webp', 'assets/app/hd/narr-voices.webp'],
  glasses: ['assets/app/hd/even-chat.webp', 'assets/app/hd/even-home.webp', 'assets/app/hd/even-terminal.webp']
};
// The turntable phone moves through all three apps, one per turn
SCREENS.hero = [SCREENS.vox[0], SCREENS.narrator[0], SCREENS.glasses[0]];

const hasWebGL = document.documentElement.classList.contains('has-webgl');
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 400));

/* ════════════════════════════════════════════════════════
   1. 3D SCENES
   ════════════════════════════════════════════════════════ */

// Loads a scene a little before its canvas scrolls into view (`margin` is how far ahead)
function whenNear(el, load, margin = '500px 0px') {
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    whenIdle(load);
  }, { rootMargin: margin }).observe(el);
}

// The phone and glasses on a turntable, under "The idea". They sit just below the first screen on wide screens, so
// they wait until the reader starts scrolling: the opening screen never starts WebGL
function initDevices3D() {
  const figure = document.querySelector('[data-devices]');
  if (!figure || !hasWebGL) return;
  whenNear(figure, async () => {
    try {
      const { mountHero } = await import('./3d/hero.js');
      await mountHero({
        canvas: figure.querySelector('[data-devices-canvas]'),
        deviceAnchor: figure.querySelector('[data-device-anchor]'),
        dragTarget: figure.querySelector('.devices__stage'),
        screens: SCREENS.hero
      });
      figure.classList.add('is-3d');
    } catch (error) {
      // The still image stays in place; the page works the same without 3D
      console.warn('Devices 3D unavailable:', error);
    }
  }, '100px 0px');
}

// Ties a showcase to scroll: progress runs 0 → 1 as its section crosses the screen, and the copy's features light
// up as the layer they describe opens
function scrubWithScroll(section, stage) {
  const features = [...section.querySelectorAll('[data-at]')];
  let queued = false;
  const update = () => {
    queued = false;
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (r.height * 0.75)));
    stage.setProgress(p);
    features.forEach((f) => f.classList.toggle('is-lit', p >= Number(f.dataset.at)));
  };
  addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function initShowcases() {
  if (!hasWebGL) return;
  document.querySelectorAll('[data-showcase]').forEach((canvas) => {
    const figure = canvas.closest('.showcase');
    whenNear(canvas, async () => {
      try {
        const { mountShowcase } = await import('./3d/showcase.js');
        const kind = canvas.dataset.showcase;
        const stage = await mountShowcase({ canvas, kind, screens: SCREENS[kind], dragTarget: canvas.parentElement });
        figure.classList.add('is-3d');
        if (kind === 'vox') {
          figure.closest('section').classList.add('is-scrubbed');
          scrubWithScroll(figure.closest('section'), stage);
        }
      } catch (error) {
        // The real screenshots stay in place
        console.warn('Showcase 3D unavailable:', error);
      }
    });
  });
}

/* ════════════════════════════════════════════════════════
   2. CASE STUDIES
   ════════════════════════════════════════════════════════ */

function initCases() {
  const cases = [...document.querySelectorAll('.case[data-case]')];
  const dots = [...document.querySelectorAll('[data-dot]')];
  if (!cases.length) return;
  const ratios = new Map();

  const setActive = (el) => {
    cases.forEach((c) => c.classList.toggle('is-active', c === el));
    dots.forEach((d) => d.classList.toggle('is-active', d.dataset.dot === el.dataset.case));
  };

  if (!('IntersectionObserver' in window)) {
    cases.forEach((c) => c.classList.add('is-active'));
    return;
  }

  // The case covering most of the middle band of the screen is the active one
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
    let best = null;
    let bestRatio = 0;
    ratios.forEach((ratio, el) => {
      if (ratio > bestRatio) {
        best = el;
        bestRatio = ratio;
      }
    });
    if (best) setActive(best);
  }, { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  cases.forEach((c) => observer.observe(c));
  setActive(cases[0]);
}

/* ════════════════════════════════════════════════════════
   3. SAMPLE PODCAST PLAYER
   ════════════════════════════════════════════════════════ */

const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function initListen() {
  const root = document.querySelector('[data-listen]');
  if (!root) return;
  const audio = root.querySelector('audio');
  const toggle = root.querySelector('[data-listen-toggle]');
  const bar = root.querySelector('[data-listen-bar]');
  const time = root.querySelector('[data-listen-time]');
  const chapters = [...root.querySelectorAll('[data-seek]')];
  const total = 169.56;

  const paint = () => {
    const t = audio.currentTime || 0;
    const d = audio.duration || total;
    bar.style.setProperty('--p', (t / d).toFixed(4));
    time.textContent = audio.paused && t === 0 ? formatTime(d) : `${formatTime(t)} / ${formatTime(d)}`;
    let current = null;
    chapters.forEach((c) => { if (t >= Number(c.dataset.seek)) current = c; });
    chapters.forEach((c) => c.setAttribute('aria-current', String(c === current && t > 0)));
  };

  const play = () => {
    audio.play().catch(() => {});
  };

  toggle.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
  chapters.forEach((c) => c.addEventListener('click', () => {
    audio.currentTime = Number(c.dataset.seek);
    play();
  }));
  bar.addEventListener('click', (event) => {
    const r = bar.getBoundingClientRect();
    audio.currentTime = ((event.clientX - r.left) / r.width) * (audio.duration || total);
    play();
  });
  audio.addEventListener('play', () => {
    root.classList.add('is-playing');
    toggle.setAttribute('aria-label', 'Pause the sample podcast');
  });
  audio.addEventListener('pause', () => {
    root.classList.remove('is-playing');
    toggle.setAttribute('aria-label', 'Play the sample podcast');
  });
  audio.addEventListener('timeupdate', paint);
  audio.addEventListener('loadedmetadata', paint);
}

/* ════════════════════════════════════════════════════════
   4. ON-PAGE RAIL
   ════════════════════════════════════════════════════════ */

// Marks the section you're reading, and shows the rail once you've scrolled past the opening screen
function initRail() {
  const rail = document.querySelector('[data-rail]');
  if (!rail || !('IntersectionObserver' in window)) return;
  const links = [...rail.querySelectorAll('a')];
  // A rail entry can span several sections (the film and the Vox Amelior details are both "02")
  const sections = [...links.map((a) => document.querySelector(a.getAttribute('href'))), ...document.querySelectorAll('[data-rail-for]')].filter(Boolean);
  const entryOf = (el) => `#${el.dataset.railFor || el.id}`;
  const visible = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => visible.set(e.target, e.isIntersecting ? e.intersectionRatio || 0.01 : 0));
    let best = null;
    let bestRatio = 0;
    visible.forEach((ratio, el) => {
      if (ratio > bestRatio) {
        best = el;
        bestRatio = ratio;
      }
    });
    links.forEach((a) => {
      if (best && a.getAttribute('href') === entryOf(best)) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] });
  sections.forEach((section) => io.observe(section));
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    new IntersectionObserver(([entry]) => rail.classList.toggle('is-shown', !entry.isIntersecting), { threshold: 0.15 }).observe(hero);
  } else {
    rail.classList.add('is-shown');
  }
}

initCases();
initListen();
initRail();
initDevices3D();
initShowcases();
