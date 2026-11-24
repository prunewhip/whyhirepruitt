/**
 * Home page behaviour (ES module):
 *   1. the entrance, started once the fonts are in so lines never reflow mid-rise
 *   2. the hero: the path-traced glasses (tools/render/g1.py) lean toward the pointer, and the turntable takes over
 *      from the still once it can play (never with reduced motion or data saver)
 *   3. counters that run up as the stats appear
 *   4. what I’ve built: a book of glass screens, live in WebGL (js/3d/book.js), that opens and turns its pages on
 *      its own, slowly, until someone takes over; the words below follow the open spread, and Learn more has a
 *      laser print the page's whole story under it
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

/* Light, for the laser effects (Learn more, the film player): layered strokes for beams and lines, one glow sprite
   stamped for every point and spark, and one overlay canvas per run, in the page or inside a dialog so it draws above
   it. run(draw, host) calls draw(g, t) every frame until it returns false. */
const LASER = (() => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext('2d');
  const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(245, 255, 250, 1)');
  rg.addColorStop(0.22, 'rgba(150, 250, 200, 0.75)');
  rg.addColorStop(0.55, 'rgba(111, 240, 166, 0.18)');
  rg.addColorStop(1, 'rgba(111, 240, 166, 0)');
  sg.fillStyle = rg;
  sg.fillRect(0, 0, 64, 64);
  const stroke = (g, ax, ay, bx, by, a) => {
    g.lineCap = 'round';
    for (const [w, c] of [[18, `rgba(111, 240, 166, ${0.08 * a})`], [7, `rgba(111, 240, 166, ${0.3 * a})`], [2.2, `rgba(238, 255, 247, ${0.95 * a})`]]) {
      g.lineWidth = w;
      g.strokeStyle = c;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    }
  };
  const stamp = (g, x, y, size, a) => {
    g.globalAlpha = Math.max(0, Math.min(1, a));
    g.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    g.globalAlpha = 1;
  };
  function run(draw, host = document.body) {
    return new Promise((resolve) => {
      const cv = document.createElement('canvas');
      cv.className = 'hx-laser';
      cv.setAttribute('aria-hidden', 'true');
      host.append(cv);
      const g = cv.getContext('2d');
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const t0 = performance.now();
      const frame = (now) => {
        if (cv.width !== Math.round(innerWidth * dpr) || cv.height !== Math.round(innerHeight * dpr)) {
          cv.width = Math.round(innerWidth * dpr);
          cv.height = Math.round(innerHeight * dpr);
        }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, innerWidth, innerHeight);
        g.globalCompositeOperation = 'lighter';
        if (draw(g, now - t0)) requestAnimationFrame(frame);
        else {
          cv.remove();
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }
  return { stroke, stamp, run };
})();

/* The laser pop: a pop-up comes out of the button that asked for it. A beam fires from the button to the top of the
   box; two points race round its edge and meet at the bottom, leaving it outlined; a scan line sweeps down and the
   inside appears behind it (reveal(px) shows the top px of it; null shows it all); then the light fades. The way
   back runs it in reverse: the inside scans away upward, the outline folds to a point, the beam goes home. */
const POP = (() => {
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const { stroke, stamp, run } = LASER;
  const edgeAt = (r, d) => {
    const w = r.width;
    const h = r.height;
    const legs = [[w / 2, 1, 0], [h, 0, 1], [w, -1, 0], [h, 0, -1], [w / 2, 1, 0]];
    let x = r.left + w / 2;
    let y = r.top;
    for (const [len, dx, dy] of legs) {
      const step = Math.min(d, len);
      x += dx * step;
      y += dy * step;
      d -= step;
      if (d <= 0) break;
    }
    return { x, y };
  };
  const perimeter = (r) => 2 * (r.width + r.height);
  const outline = (g, r, upTo, a) => {
    const L = perimeter(r);
    const n = 40;
    for (const dir of [1, -1]) {
      let prev = edgeAt(r, dir > 0 ? 0 : L);
      for (let i = 1; i <= n; i++) {
        const d = (upTo * i) / n;
        const pt = edgeAt(r, dir > 0 ? d : L - d);
        stroke(g, prev.x, prev.y, pt.x, pt.y, a * 0.75);
        prev = pt;
      }
    }
  };
  const centre = (el) => {
    if (!el || !el.isConnected) return { x: innerWidth / 2, y: innerHeight + 30 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const buzz = (ms) => {
    try { if (navigator.vibrate && !reduced.matches) navigator.vibrate(ms); } catch (error) { /* no vibration: fine */ }
  };

  // in({ host, box, from, reveal, onScan }): host, the dialog the light draws in; box(), the rect to pop out;
  // from, the element it comes from; onScan, once, as the inside starts to appear
  function popIn({ host, box, from, reveal, onScan = () => {} }) {
    const sparks = [];
    let scanning = false;
    const FIRE = 170;
    const TRACE = 420;
    const SCAN = 460;
    const FADE = 320;
    buzz(12);
    reveal(0);
    return run((g, t) => {
      const r = box();
      const o = centre(from);
      const L = perimeter(r);
      const top = { x: r.left + r.width / 2, y: r.top };
      stamp(g, o.x, o.y, 64, t < FIRE + TRACE + SCAN ? 1 : 1 - (t - FIRE - TRACE - SCAN) / FADE);
      if (t < FIRE) {
        const k = ease(t / FIRE);
        const tx = o.x + (top.x - o.x) * k;
        const ty = o.y + (top.y - o.y) * k;
        stroke(g, o.x, o.y, tx, ty, 0.5 + 0.5 * k);
        stamp(g, tx, ty, 40, 1);
        return true;
      }
      if (t < FIRE + TRACE) {
        const traced = ease((t - FIRE) / TRACE) * (L / 2);
        outline(g, r, traced, 1);
        for (const head of [edgeAt(r, traced), edgeAt(r, L - traced)]) {
          stroke(g, o.x, o.y, head.x, head.y, 0.7);
          stamp(g, head.x, head.y, 44, 1);
          sparks.push({ x: head.x, y: head.y, vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.7) * 2.4, life: 1 });
        }
      } else {
        if (!scanning) {
          scanning = true;
          onScan();
        }
        const p = clamp01((t - FIRE - TRACE) / SCAN);
        const life = t < FIRE + TRACE + SCAN ? 1 : Math.max(0, 1 - (t - FIRE - TRACE - SCAN) / FADE);
        const y = ease(p) * r.height;
        reveal(p >= 1 ? null : y);
        outline(g, r, L / 2, life);
        if (p < 1) {
          stroke(g, r.left + 6, r.top + y, r.right - 6, r.top + y, life);
          stroke(g, o.x, o.y, r.left + 6, r.top + y, 0.35 * life);
          stroke(g, o.x, o.y, r.right - 6, r.top + y, 0.35 * life);
          for (let i = 0; i < 3; i++) sparks.push({ x: r.left + Math.random() * r.width, y: r.top + y, vx: (Math.random() - 0.5) * 1.4, vy: -(0.4 + Math.random() * 1.6), life: 1 });
        }
        if (life <= 0) return false;
      }
      for (const k of sparks) {
        k.x += k.vx;
        k.y += k.vy;
        k.vy += 0.05;
        k.life -= 0.035;
        if (k.life > 0) stamp(g, k.x, k.y, 13, k.life);
      }
      while (sparks.length && sparks[0].life <= 0) sparks.shift();
      return true;
    }, host);
  }

  function popOut({ host, box, from, reveal }) {
    const SCAN = 300;
    const FOLD = 300;
    buzz(8);
    return run((g, t) => {
      const r = box();
      const o = centre(from);
      if (t < SCAN) {
        const y = (1 - ease(t / SCAN)) * r.height;
        reveal(y);
        outline(g, r, perimeter(r) / 2, 1);
        stroke(g, r.left + 6, r.top + y, r.right - 6, r.top + y, 1);
        return true;
      }
      reveal(0);
      const p = ease(clamp01((t - SCAN) / FOLD));
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = r.width * (1 - p) * 0.5;
      const h = r.height * Math.max(0, 1 - p * 1.6) * 0.5;
      const fold = { left: cx - w, top: cy - h, width: 2 * w, height: 2 * h, right: cx + w };
      if (w > 1) outline(g, fold, perimeter(fold) / 2, 1 - p * 0.4);
      const hx = cx + (o.x - cx) * p;
      const hy = cy + (o.y - cy) * p;
      stroke(g, hx, hy, cx, cy, 1 - p);
      stamp(g, hx, hy, 50, 1);
      return t < SCAN + FOLD;
    }, host);
  }
  return { in: popIn, out: popOut };
})();

// The story sheets, by id: open(from) pops one out of the element that asked (filled in by initMore)
const sheets = {};

/* 4. What I've built: a book of glass screens on one hinge, live in WebGL (js/3d/book.js). It waits closed on its
   cover until it comes into view, opens onto Vox Amelior, then turns one page per tool: Linux on the glasses, the
   podcast, Vox Learn. Arrows, the names, either half of the book, swipes and the chips under The Tech Stack all turn
   it, and it turns itself, slowly (the bar counts down), resting while someone points at it or the stack below,
   reads a "More" sheet or watches a film, and never at all with reduced motion. The pause button stops it for
   good. Tap either half to turn a page (or open the closed book), or drag a page across; pinching zooms the
   page as anywhere else. The words below it,
   and The Tech Stack, follow the open spread. Without WebGL, the path-traced stills of the
   same book (tools/render/book.py) take its place, one per spread. */
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
  const figure = root.querySelector('[data-book]');
  const canvas = root.querySelector('[data-book-canvas]');
  const still = root.querySelector('[data-book-still]');
  const film = root.querySelector('[data-book-film]');
  const stage = root.querySelector('[data-book-stage]');
  const copy = root.querySelector('[data-strip-stage]');
  const pages = [...root.querySelectorAll('.hx-page')];
  const tabs = [...root.querySelectorAll('[data-go]')];
  const count = root.querySelector('[data-strip-count]');
  const bar = root.querySelector('[data-strip-bar]');
  const fill = root.querySelector('.hx-flip__fill');
  const pauseButton = root.querySelector('[data-deck-pause]');
  const tech = document.querySelector('[data-techstack]');
  const techItems = tech ? [...tech.querySelectorAll('[data-stack-for]')] : [];
  const chips = tech ? [...tech.querySelectorAll('[data-stack-pick]')] : [];
  const stills = figure.dataset.stills.split(' ');
  const n = pages.length;
  const auto = !reduced.matches;
  // Reduced motion: the book still opens and turns when someone asks, just never on its own, and it doesn't sway
  const calm = reduced.matches;
  const hint = root.querySelector('[data-book-hint]');
  root.style.setProperty('--n', n);
  let current = 0;
  let inView = false;
  let book = null;
  let loading = false;

  // ?debug: a badge on the book says whether the live 3D is running, and why not
  const debug = new URLSearchParams(location.search).has('debug') ? document.createElement('p') : null;
  const report = (state) => {
    if (debug) debug.textContent = `3D ${state} · motion ${calm ? 'reduced' : 'full'}${saveData() ? ' · data saver' : ''}`;
  };
  if (debug) {
    debug.className = 'hx-book__debug mono';
    stage.append(debug);
    report('waiting');
  }

  // The hint on the book: how to work it
  const syncHint = () => {
    if (hint) hint.querySelector('span').textContent = book && !book.isOpen() ? 'Tap to open' : 'Tap or drag to turn';
  };
  // Open and closed: closed, it rests on its cover and waits (the countdown too) until someone opens it; once
  // someone has closed it, it stays closed until opened again
  let closedByHand = false;
  const openBook = () => {
    if (!book || book.isOpen()) return;
    book.open();
    syncHint();
    setPause('closed', false);
    restartClock();
  };
  const closeBook = () => {
    if (!book || !book.isOpen()) return;
    book.close();
    closedByHand = true;
    syncHint();
    setPause('closed', true);
    if (hint) hint.classList.remove('is-gone');
  };
  // Back from the first page closes the book; it never wraps round to the last
  const back = () => {
    if (current > 0) select(current - 1);
    else closeBook();
  };

  // The live book: loaded once the section is near; it waits closed on its cover, and opens as it comes into view
  // (with reduced motion, when someone taps it)
  async function load3D() {
    if (loading) return;
    loading = true;
    report('loading');
    try {
      const { createBook } = await import('./3d/book.js');
      book = await createBook(canvas, { screens: figure.dataset.screens, film: saveData() ? null : film, calm });
      onDialog.push((open) => book.hold(open));
      book.onAnchor((a) => {
        if (a.show) {
          anchor = a;
          learn.style.setProperty('--lx', `${a.x.toFixed(1)}px`);
          learn.style.setProperty('--ly', `${a.y.toFixed(1)}px`);
        }
        learn.classList.toggle('is-shown', a.show);
      });
      if (current !== 0) book.jumpTo(current); // a page was chosen while it loaded: open there
      else setPause('closed', true);
      book.setVisible(inView);
      root.classList.add('is-3d');
      syncHint();
      if (inView && !calm && !closedByHand) setTimeout(openBook, 400);
      report(`on · ${book.info}`);
    } catch (error) {
      book = null; // no WebGL: the stills carry on
      report(`off · ${error && error.message ? error.message : error}`);
    }
  }

  // The Tech Stack follows the open spread
  const syncTech = () => {
    if (!techItems[current]) return; // the last spread has no stack of its own: the last one stays
    techItems.forEach((item, i) => {
      const on = i === current;
      if (item.hidden !== on) return;
      item.hidden = !on;
      if (on) {
        item.classList.remove('is-in');
        void item.offsetWidth;
        item.classList.add('is-in');
      }
    });
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === current)));
  };

  // The countdown: the bar under the book fills, and when it's full the page turns
  const restartClock = () => {
    if (!fill) return;
    fill.classList.remove('is-running');
    void fill.offsetWidth;
    fill.classList.add('is-running');
  };

  function select(next) {
    next = (next + n) % n;
    if (next === current) return;
    root.style.setProperty('--from', next > current ? '24px' : '-24px');
    current = next;
    const page = pages[next];
    root.style.setProperty('--dwell', `${page.dataset.dwell || 9}s`);
    pages.forEach((p, i) => {
      p.hidden = i !== next;
      p.classList.remove('is-in');
    });
    void page.offsetWidth;
    page.classList.add('is-in');
    tabs.forEach((tab, i) => { if (i === next) tab.setAttribute('aria-current', 'true'); else tab.removeAttribute('aria-current'); });
    figure.setAttribute('aria-label', page.dataset.alt);
    count.textContent = `${pad(next + 1)} / ${pad(n)}`;
    bar.style.transform = `translateX(${next * 100}%)`;
    if (book) book.setPage(next);
    else still.src = stills[Math.min(next, stills.length - 1)];
    restartClock();
    syncTech();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => select(Number(tab.dataset.go))));
  chips.forEach((chip, i) => chip.addEventListener('click', () => select(i)));
  root.querySelector('[data-strip-prev]').addEventListener('click', () => back());
  root.querySelector('[data-strip-next]').addEventListener('click', () => select(current + 1));

  // By hand: a tap on either half turns the page that way (the closed book opens); a drag turns the page under the
  // finger, and let go, it finishes its turn or settles back. A pinch is the browser's: it zooms the page, book and
  // all, and the pages still turn while zoomed
  let touched = false;
  const touch = () => {
    if (touched) return;
    touched = true;
    if (hint) hint.classList.add('is-gone');
  };
  const tap = (dir) => {
    touch();
    if (book && !book.isOpen()) openBook();
    else if (dir < 0) back();
    else select(current + 1);
  };
  const endTurn = (keep) => {
    const wasOpen = book.isOpen();
    let page;
    if (keep) page = book.dragEnd();
    else {
      book.dragCancel();
      page = wasOpen ? current : -1;
    }
    setPause('drag', false);
    root.classList.remove('is-dragging');
    if (page < 0 && wasOpen) {
      // dragged shut
      closedByHand = true;
      setPause('closed', true);
      if (hint) hint.classList.remove('is-gone');
    } else if (page >= 0 && !wasOpen) {
      setPause('closed', false);
      restartClock();
    }
    syncHint();
    if (page >= 0 && page !== current) select(page);
  };
  let drag = null;
  let fingers = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('[data-book-learn]')) return;
    fingers += 1;
    // a second finger: that's the browser's pinch, so let go of any turn
    if (fingers > 1) {
      if (drag && drag.on) endTurn(false);
      drag = null;
      return;
    }
    drag = { x0: e.clientX, y0: e.clientY, id: e.pointerId, on: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.on && book && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        drag.on = true;
        stage.setPointerCapture(e.pointerId);
        book.dragStart();
        setPause('drag', true);
        root.classList.add('is-dragging');
        touch();
      }
      if (drag.on) book.dragMove(-dx / (stage.clientWidth * 0.42));
      return;
    }
    // Otherwise the book leans toward the mouse
    if (book && e.pointerType === 'mouse' && finePointer.matches && !calm) {
      const r = stage.getBoundingClientRect();
      book.lean(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    }
  });
  const up = (e) => {
    fingers = Math.max(0, fingers - 1);
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (drag.on) endTurn(e.type === 'pointerup'); // the browser took the gesture (scroll, pinch): put the page back
    else if (e.type === 'pointerup' && Math.hypot(dx, dy) < 10) {
      const r = stage.getBoundingClientRect();
      tap(e.clientX < r.left + r.width / 2 ? -1 : 1);
    } else if (!book && e.type === 'pointerup' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) select(current + 1); // the stills: a swipe
      else back();
    }
    drag = null;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { if (book) book.lean(null, null); });

  // ── Learn more: the open page's whole story pops out of the card in a sheet (initMore), by laser ──
  const learn = root.querySelector('[data-book-learn]');
  let anchor = null; // where Learn more rides on the card, in the canvas's pixels
  learn.addEventListener('click', () => {
    touch();
    learn.classList.add('is-firing');
    setTimeout(() => learn.classList.remove('is-firing'), 600);
    if (book) book.reboot();
    const open = sheets[`more-${current + 1}`];
    if (open) open(learn);
  });

  // Near the screen, the book loads; on it, it opens, and the film and the countdown run
  new IntersectionObserver(([entry]) => { if (entry.isIntersecting) load3D(); }, { rootMargin: '900px 0px' }).observe(figure);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setPause('view', !inView);
    if (book) {
      book.setVisible(inView);
      if (inView && !calm && !closedByHand) setTimeout(openBook, 400);
    }
  }, { threshold: 0.35 }).observe(figure);

  if (auto) {
    root.classList.add('is-auto');
    root.style.setProperty('--dwell', `${pages[0].dataset.dwell || 9}s`);
    // While it turns itself, screen readers aren't told every page; once it rests, they are
    onPause = () => {
      root.classList.toggle('is-paused', pauses.size > 0);
      root.dataset.resting = [...pauses].join(' ');
      copy.setAttribute('aria-live', pauses.size ? 'polite' : 'off');
    };
    onPause();
    restartClock();
    fill.addEventListener('animationend', () => select(current + 1));
    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPause('hover', true); });
    root.addEventListener('pointerleave', () => setPause('hover', false));
    if (tech) {
      tech.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setPause('stack', true); });
      tech.addEventListener('pointerleave', () => setPause('stack', false));
    }
    root.addEventListener('focusin', (e) => setPause('focus', e.target.matches(':focus-visible')));
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) setPause('focus', false); });
    document.addEventListener('visibilitychange', () => setPause('tab', document.hidden));
    pauseButton.addEventListener('click', () => {
      const off = pauseButton.getAttribute('aria-pressed') !== 'true';
      pauseButton.setAttribute('aria-pressed', String(off));
      pauseButton.setAttribute('aria-label', off ? 'Keep turning the pages' : 'Stop turning the pages');
      setPause('user', off);
    });
  } else {
    copy.setAttribute('aria-live', 'polite');
  }
}

/* 5. The short films (tools/film/shorts.html): square, with music, and only when asked; a laser pops each one out
   of the button that asked for it, and puts it back */
const SHORTS = {
  story: {
    title: 'Home life, work life, brain life · 0:39 · people and sessions are examples',
    words: 'AI that makes life a little lighter. Home life: forget nothing, share nothing. Work life: your computer, one look away; the employee handbook, now with a plot. Brain life: answer out loud, it sticks. Wired to the frontier: when the models get smarter, so do you. Better home life. Better work life. Better brain life.'
  },
  podcast: {
    title: 'The podcast · 0:24 · the company is an example',
    words: 'Name a subject: your new job? Make it a show. Claude writes it: a script at your level. Your phone reads it: two natural voices, on the phone. Put it on while Claude builds: one AI does the work, the other tells the story.'
  },
  more: {
    title: 'And more to come · 0:18',
    words: 'The frontier moves: today’s best model is tomorrow’s baseline. Every card keeps up: when the models get smarter, so do they. To be continued: and more to come.'
  },
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
const onDialog = []; // who wants to know when a pop-up opens or closes (the book stops drawing under one)
const syncLock = () => {
  const open = document.querySelector('dialog[open]');
  html.style.overflow = open ? 'hidden' : '';
  setPause('dialog', Boolean(open));
  onDialog.forEach((fn) => fn(Boolean(open)));
};

function initShorts() {
  const dialog = document.querySelector('[data-reel]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const video = dialog.querySelector('video');
  const title = dialog.querySelector('[data-reel-title]');
  const words = dialog.querySelector('[data-reel-words]');
  const frame = dialog.querySelector('[data-reel-frame]');
  const cover = dialog.querySelector('.hx-reel__cover');
  let opener = null;
  let busy = false;
  const calm = () => reduced.matches;
  const reveal = (px) => { cover.style.transform = px === null ? 'translate3d(0, 101%, 0)' : `translate3d(0, ${px}px, 0)`; };
  const box = () => frame.getBoundingClientRect();
  // In: out of the button that asked, the film already playing as it scans in; the words and the × follow
  async function popIn() {
    dialog.classList.add('is-firing');
    await POP.in({ host: dialog, box, from: opener, reveal, onScan: () => video.play().catch(() => {}) });
    dialog.classList.remove('is-firing');
  }
  // Out: back the way it came, then closed
  async function popOut() {
    if (busy) return;
    busy = true;
    video.pause();
    if (!calm()) {
      dialog.classList.add('is-firing');
      await POP.out({ host: dialog, box, from: opener, reveal });
    }
    dialog.close();
    dialog.classList.remove('is-firing');
    busy = false;
  }

  document.querySelectorAll('[data-short]').forEach((button) => button.addEventListener('click', () => {
    const name = button.dataset.short;
    const film = SHORTS[name];
    if (!film || busy) return;
    opener = button;
    video.poster = `assets/video/short-${name}-poster.webp`;
    video.src = `assets/video/short-${name}.mp4`;
    title.textContent = film.title;
    words.textContent = `Words on screen, with music: ${film.words}`;
    dialog.showModal();
    syncLock();
    if (calm()) video.play().catch(() => {});
    else popIn();
  }));

  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    cover.style.transform = '';
    syncLock();
    if (opener) opener.focus();
  });
  // Escape, the ×, or a tap on the dimmed page around the film: all leave the same way
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    popOut();
  });
  dialog.querySelector('[data-reel-close]').addEventListener('click', popOut);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) popOut();
  });
}

/* 6. More: each page's whole story in a sheet (its film, the story, the architecture). Learn more on the card, or
   a "More on" button, pops it out by laser; the × (or Escape, or a tap outside) sends it back the same way. Its film
   plays once it's out; at the film's end, Read the whole story glides down to the words */
function initMore() {
  document.querySelectorAll('dialog.hx-more').forEach((dialog) => {
    if (typeof dialog.showModal !== 'function') return;
    const panel = dialog.querySelector('.hx-more__panel');
    const video = dialog.querySelector('.hx-film__video');
    const next = dialog.querySelector('[data-read-more]');
    const read = dialog.querySelector('[data-read]');
    const title = dialog.querySelector('.hx-more__title');
    let opener = null;
    let busy = false;
    const reveal = (px) => { panel.style.clipPath = px === null ? '' : `inset(0 0 calc(100% - ${Math.max(0, px).toFixed(1)}px) 0)`; };
    const box = () => dialog.getBoundingClientRect();
    if (title) title.tabIndex = -1;
    if (video && next && read) {
      video.addEventListener('ended', () => { next.hidden = false; });
      video.addEventListener('play', () => { next.hidden = true; });
      next.addEventListener('click', () => {
        const y = read.getBoundingClientRect().top - dialog.getBoundingClientRect().top + dialog.scrollTop - 18;
        dialog.scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
      });
    }
    const startFilm = (autoplay) => {
      if (!video) return;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      if (!autoplay || saveData()) return;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    async function open(from) {
      if (dialog.open || busy) return;
      opener = from || null;
      if (video && video.dataset.poster) video.poster = video.dataset.poster;
      if (next) next.hidden = true;
      dialog.showModal();
      dialog.scrollTop = 0;
      syncLock();
      if (!reduced.matches) {
        busy = true;
        dialog.classList.add('is-firing');
        // it opens at the top: hold it there while it scans in
        await POP.in({ host: dialog, box, from: opener, reveal: (px) => { if (dialog.scrollTop) dialog.scrollTop = 0; reveal(px); } });
        reveal(null);
        dialog.classList.remove('is-firing');
        busy = false;
      }
      startFilm(!reduced.matches);
      if (title) title.focus({ preventScroll: true });
    }
    async function close() {
      if (!dialog.open || busy) return;
      busy = true;
      if (video) video.pause();
      if (!reduced.matches) {
        dialog.classList.add('is-firing');
        await POP.out({ host: dialog, box, from: opener, reveal });
      }
      dialog.close();
      dialog.classList.remove('is-firing');
      reveal(null);
      busy = false;
    }
    sheets[dialog.id] = open;
    dialog.querySelector('[data-more-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener('close', () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      syncLock();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
  });
  document.querySelectorAll('[data-more]').forEach((button) => button.addEventListener('click', () => {
    const open = sheets[button.dataset.more];
    if (open) open(button);
  }));
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
