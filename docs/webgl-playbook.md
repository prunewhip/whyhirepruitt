# WebGL Playbook

## Overview
This document covers the integration patterns for adding 3D WebGL scenes to demo pages.

---

## Quick Start

### 1. Add Scene Shell to HTML
```html
<!-- Add to hero/primary panel area -->
<div class="scene-shell" id="{engine}-viz"></div>

<!-- Add before </body> -->
<script type="module" src="assets/js/pages/{engine}-scene.js"></script>
```

### 2. Create Scene Module
```javascript
// demo/assets/js/pages/{engine}-scene.js
import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, getPerformanceLimits } from '../webgl/perf.js';

export function mount(container) {
    // Check for reduced motion
    if (prefersReducedMotion()) {
        return mountFallback(container);
    }

    // Initialize scene
    const bundle = initScene(container);
    if (!bundle) return mountFallback(container);

    // Setup scene content...

    // Create animation loop
    const loop = createAnimationLoop((delta) => {
        // Update and render...
        bundle.renderer.render(bundle.scene, bundle.camera);
    }, bundle.isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            bundle.destroy();
        }
    };
}

function mountFallback(container) {
    // SVG/Lottie fallback
}

// Auto-mount
lazyMount(document.querySelector('.scene-shell'), () => mount(container));
```

---

## Performance Rules

| Rule | Implementation |
|------|----------------|
| Lazy load | Use `lazyMount()` with IntersectionObserver |
| Cap DPR | `Math.min(devicePixelRatio, 1.5)` in scene-core.js |
| Pause on hidden | `isVisible()` check in animation loop |
| GPU tiering | `detectGPUTier()` → adjust particle counts |
| Frame budget | Target 16.67ms per frame (60fps) |

---

## Fallback Strategy

1. Check `prefersReducedMotion()` first
2. Check GPU tier with `detectGPUTier()`
3. Low tier → disable bloom/DOF, reduce particles
4. Very low → swap to Lottie/SVG entirely

```javascript
const tier = detectGPUTier();
const limits = getPerformanceLimits(tier);

if (tier === GPU_TIER.LOW) {
    return mountLottieFallback(container);
}
```

---

## CSS Integration

Scene shells should have proper sizing:
```css
.scene-shell {
    position: relative;
    width: 100%;
    height: 400px;
    min-height: 300px;
    background: var(--bg-cream);
    border-radius: var(--radius-lg);
    overflow: hidden;
}
```

---

## Cleanup

Always implement `destroy()` method:
```javascript
return {
    destroy: () => {
        loop.stop();           // Stop animation
        fpsMeter.destroy();    // Remove overlay
        geometry.dispose();    // Dispose geometries
        material.dispose();    // Dispose materials
        bundle.destroy();      // Remove canvas
    }
};
```

---

## Debugging

Enable FPS meter in development:
```javascript
const fpsMeter = createFPSMeter(container, { showInProduction: false });

// In render loop:
fpsMeter.update();
```
