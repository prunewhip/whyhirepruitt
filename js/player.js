/**
 * Video players (commercial on the home page, product tour on "How it's built", story on "About"):
 * poster/play overlay, chapter seeking and progress. Only one video plays at a time,
 * and a link with data-play="<section id>" scrolls to that player and starts it.
 * A video with data-preview (and data-preview-portrait) loops that silent clip while it's on screen, until
 * someone presses play; then the full video starts from the beginning, with sound.
 * On phones, a 1920×1080 frame shrinks its text below 10px, so:
 *   .player--portrait-on-phones  swaps in a 4:5 cut with larger type (data-src-portrait, data-poster-portrait)
 *   .player--fullscreen-on-phones  plays full screen in landscape instead
 */
(() => {
  const players = new Map();
  const phone = matchMedia('(max-width: 699px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /** Swaps between the 16:9 cut and the phone's 4:5 cut, unless a video is already playing. */
  function fitCut(player, video) {
    const source = video.querySelector('source[data-src-portrait]');
    if (!source) return;
    const cuts = {
      landscape: { src: source.getAttribute('src'), poster: video.getAttribute('poster') },
      portrait: { src: source.dataset.srcPortrait, poster: video.dataset.posterPortrait }
    };
    const apply = () => {
      if (player.classList.contains('is-started')) return;
      const cut = phone.matches ? cuts.portrait : cuts.landscape;
      if (source.getAttribute('src') === cut.src) return;
      source.setAttribute('src', cut.src);
      video.poster = cut.poster;
      video.load();
    };
    apply();
    phone.addEventListener('change', apply);
  }

  /**
   * Loops the silent preview while the player is on screen. Skipped with reduced motion or data saver, where the
   * poster stays. Returns a function that stops the preview and hands the video back to its own sources.
   */
  function initPreview(player, video) {
    const clips = { landscape: video.dataset.preview, portrait: video.dataset.previewPortrait || video.dataset.preview };
    if (!clips.landscape || reducedMotion.matches || navigator.connection?.saveData) return null;
    let onScreen = false;
    const run = () => {
      if (!player.classList.contains('is-previewing')) return;
      if (onScreen) video.play().catch(() => {});
      else video.pause();
    };
    const load = () => {
      // A src attribute wins over the <source> elements until it's removed
      video.src = phone.matches ? clips.portrait : clips.landscape;
      run();
    };
    video.muted = true;
    video.loop = true;
    player.classList.add('is-previewing');
    load();
    phone.addEventListener('change', () => { if (player.classList.contains('is-previewing')) load(); });
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      run();
    }, { threshold: 0.25 }).observe(video);
    return () => {
      player.classList.remove('is-previewing');
      video.pause();
      video.removeAttribute('src');
      video.muted = false;
      video.loop = false;
      video.preload = 'auto';
      video.load();
    };
  }

  /** Full screen, turned sideways where the browser allows it (Android); iPhone uses its own player. */
  function enterFullscreen(video) {
    try {
      const request = video.requestFullscreen || video.webkitRequestFullscreen;
      if (request) {
        Promise.resolve(request.call(video))
          .then(() => screen.orientation?.lock?.('landscape'))
          .catch(() => {});
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      // Inline playback still works
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      try { screen.orientation?.unlock?.(); } catch { /* not supported */ }
    }
  });

  function initPlayer(player) {
    const video = player.querySelector('video');
    const overlay = player.querySelector('[data-player-play]');
    const overlayLabel = overlay.querySelector('.player__play-label');
    const chapters = [...player.querySelectorAll('.chapter')].map((button) => ({
      button,
      start: Number(button.dataset.start),
      end: Number(button.dataset.end)
    }));
    let frame = 0;
    fitCut(player, video);
    const stopPreview = initPreview(player, video);

    const start = (at) => {
      // From the preview, the film itself starts at the beginning
      if (player.classList.contains('is-previewing')) {
        stopPreview();
        at = undefined;
      }
      player.classList.add('is-started');
      video.controls = true;
      if (phone.matches && player.classList.contains('player--fullscreen-on-phones')) enterFullscreen(video);
      const seekAndPlay = () => {
        if (typeof at === 'number') video.currentTime = at;
        const attempt = video.play();
        if (attempt) attempt.catch(() => {
          // Autoplay policy or decode failure: fall back to native controls
          player.classList.remove('is-started');
        });
      };
      if (typeof at === 'number' && video.readyState < 1) {
        video.preload = 'auto';
        video.addEventListener('loadedmetadata', seekAndPlay, { once: true });
        video.load();
      } else {
        seekAndPlay();
      }
    };

    const paint = () => {
      const t = video.currentTime;
      chapters.forEach(({ button, start: s, end: e }) => {
        const progress = Math.min(1, Math.max(0, (t - s) / (e - s)));
        const active = t >= s && t < e;
        button.style.setProperty('--progress', progress.toFixed(4));
        button.classList.toggle('is-active', active);
        if (active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    };

    const loop = () => {
      paint();
      frame = requestAnimationFrame(loop);
    };

    overlay.addEventListener('click', () => start(video.ended ? 0 : undefined));
    chapters.forEach(({ button, start: s }) => button.addEventListener('click', () => start(s)));

    video.addEventListener('play', () => {
      // One video at a time
      players.forEach(({ video: other }) => { if (other !== video) other.pause(); });
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    });
    video.addEventListener('pause', () => {
      cancelAnimationFrame(frame);
      paint();
    });
    video.addEventListener('seeked', paint);
    video.addEventListener('ended', () => {
      cancelAnimationFrame(frame);
      paint();
      player.classList.remove('is-started');
      overlayLabel.firstChild.textContent = 'Watch again ';
    });

    // If every source fails, point people to the transcript instead of a dead frame. Source errors don't bubble, so
    // listen while they pass down to the <source>, and only count the last one (sources can be swapped or reloaded)
    video.addEventListener('error', (event) => {
      if (event.target.tagName !== 'SOURCE' || event.target !== [...video.querySelectorAll('source')].pop()) return;
      player.classList.remove('is-started');
      if (!overlay.querySelector('.player__unavailable')) {
        overlay.insertAdjacentHTML('beforeend', '<span class="player__unavailable">Video unavailable. The transcript is below.</span>');
      }
      player.classList.add('is-unavailable');
    }, true);
    video.addEventListener('loadeddata', () => player.classList.remove('is-unavailable'));

    players.set(player.closest('section')?.id, { video, start });
  }

  function initPlayers() {
    document.querySelectorAll('[data-player]').forEach(initPlayer);
    // The hero's video link scrolls to its player and starts it in one gesture
    document.querySelectorAll('[data-play]').forEach((link) => {
      link.addEventListener('click', () => players.get(link.dataset.play)?.start());
    });
  }

  initPlayers();
})();
