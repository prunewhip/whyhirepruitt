/**
 * Architecture page — draws the connector wires of the system diagram.
 * Wires attach to node edges, redraw on resize and after fonts load,
 * and highlight on hover. Hidden below 760px, where layers stack instead.
 */

(() => {
  'use strict';

  const diagram = document.querySelector('[data-diagram]');
  const svg = diagram?.querySelector('.diagram__wires');
  if (!diagram || !svg) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CONNECTIONS = [
    ['node-frontend', 'node-nginx'],
    ['node-mobile', 'node-nginx'],
    ['node-nginx', 'node-api', 'side'],
    ['node-api', 'node-transcribe'],
    ['node-api', 'node-gemma'],
    ['node-api', 'node-rag'],
    ['node-api', 'node-emotion'],
    ['node-transcribe', 'node-gpu'],
    ['node-gemma', 'node-gpu'],
    ['node-gpu', 'node-redis', 'side'],
    ['node-rag', 'node-postgres']
  ];

  const wires = [];

  function anchor(rect, origin, edge) {
    const x = rect.left - origin.left;
    const y = rect.top - origin.top;
    switch (edge) {
      case 'top': return [x + rect.width / 2, y];
      case 'bottom': return [x + rect.width / 2, y + rect.height];
      case 'left': return [x, y + rect.height / 2];
      default: return [x + rect.width, y + rect.height / 2];
    }
  }

  function draw() {
    svg.replaceChildren();
    wires.length = 0;
    if (getComputedStyle(svg).display === 'none') return;

    const origin = diagram.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);

    CONNECTIONS.forEach(([fromId, toId, mode]) => {
      const from = document.getElementById(fromId);
      const to = document.getElementById(toId);
      if (!from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();

      let d;
      let start;
      let end;
      if (mode === 'side') {
        // Same-row neighbours: short horizontal link between facing edges
        start = anchor(a, origin, a.left < b.left ? 'right' : 'left');
        end = anchor(b, origin, a.left < b.left ? 'left' : 'right');
        d = `M${start[0]} ${start[1]} L${end[0]} ${end[1]}`;
      } else {
        start = anchor(a, origin, 'bottom');
        end = anchor(b, origin, 'top');
        const bend = Math.max(24, (end[1] - start[1]) * 0.5);
        d = `M${start[0]} ${start[1]} C${start[0]} ${start[1] + bend}, ${end[0]} ${end[1] - bend}, ${end[0]} ${end[1]}`;
      }

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'wire');
      svg.append(path);

      [start, end].forEach(([cx, cy]) => {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', cx);
        dot.setAttribute('cy', cy);
        dot.setAttribute('r', 2.5);
        dot.setAttribute('class', 'wire-dot');
        svg.append(dot);
      });

      wires.push({ path, from, to });
    });
  }

  // Hover tracing: highlight a node, its neighbours and the wires between them
  function setActive(node, on) {
    wires.forEach(({ path, from, to }) => {
      if (from !== node && to !== node) return;
      path.classList.toggle('is-active', on);
      from.classList.toggle('is-active', on);
      to.classList.toggle('is-active', on);
    });
  }

  diagram.querySelectorAll('.node').forEach((node) => {
    node.addEventListener('pointerenter', () => setActive(node, true));
    node.addEventListener('pointerleave', () => setActive(node, false));
  });

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };

  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(diagram);
  else window.addEventListener('resize', schedule);
  document.fonts?.ready.then(schedule);
  // The reveal transition moves the whole figure; redraw once it settles
  diagram.addEventListener('transitionend', (event) => {
    if (event.target === diagram) schedule();
  });
  schedule();
})();
