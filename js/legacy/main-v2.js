/**
 * Premium Portfolio - Main JavaScript
 * Minimal, purposeful interactions
 */

// Navigation scroll behavior
class Navigation {
  constructor() {
    // Support both legacy .nav and new .vox-nav selectors
    this.nav = document.querySelector('.vox-nav') || document.querySelector('.nav');
    this.toggle = document.querySelector('.vox-nav-toggle') || document.querySelector('.nav-toggle');
    this.links = document.querySelector('.vox-nav-links') || document.querySelector('.nav-links');
    this.lastScroll = 0;

    this.init();
  }

  init() {
    // Scroll effect
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });

    // Mobile toggle
    if (this.toggle) {
      this.toggle.addEventListener('click', () => this.toggleMenu());
    }

    // Close menu on link click
    this.links?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
  }

  onScroll() {
    const scroll = window.scrollY;

    if (scroll > 50) {
      this.nav?.classList.add('scrolled');
    } else {
      this.nav?.classList.remove('scrolled');
    }

    this.lastScroll = scroll;
  }

  toggleMenu() {
    this.toggle?.classList.toggle('active');
    this.links?.classList.toggle('open');
    document.body.style.overflow = this.links?.classList.contains('open') ? 'hidden' : '';
  }

  closeMenu() {
    this.toggle?.classList.remove('active');
    this.links?.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Scroll reveal animations
class RevealOnScroll {
  constructor() {
    this.elements = document.querySelectorAll('.reveal, .reveal-stagger');
    this.init();
  }

  init() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.elements.forEach(el => observer.observe(el));
  }
}

// Cursor glow effect
class CursorGlow {
  constructor() {
    this.glow = document.querySelector('.glow-effect');
    if (this.glow) this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });
  }
}

// Smooth number counter
class Counter {
  constructor(element, target, duration = 2000) {
    this.element = element;
    this.target = target;
    this.duration = duration;
    this.hasAnimated = false;
  }

  animate() {
    if (this.hasAnimated) return;
    this.hasAnimated = true;

    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (this.target - start) * eased);

      this.element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        this.element.textContent = this.target.toLocaleString();
      }
    };

    requestAnimationFrame(update);
  }
}

// Initialize counters with intersection observer
class CounterObserver {
  constructor() {
    this.counters = [];
    this.init();
  }

  init() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const counter = new Counter(el, target);
      this.counters.push({ element: el, counter });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const found = this.counters.find(c => c.element === entry.target);
            if (found) found.counter.animate();
          }
        });
      },
      { threshold: 0.5 }
    );

    this.counters.forEach(({ element }) => observer.observe(element));
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new Navigation();
  new RevealOnScroll();
  new CursorGlow();
  new CounterObserver();
});
