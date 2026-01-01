# Vox Amelior Visual System Addendum

## Overview
This document defines the visual extensions for 3D/WebGL scenes while preserving the existing warm, cream design system.

---

## Palette Extensions
All colors derive from existing `design-system.css` tokens. No new hues introduced.

### Existing Tokens (Reference)
```css
/* From css/design-system.css */
--bg-cream: #faf8f5;
--bg-warm: #f5f0e8;
--text-primary: #1a1a1a;
--text-muted: #6b7280;
--accent-primary: /* existing purple/violet */
--accent-secondary: /* existing teal/cyan */
```

### 3D Scene Adaptations
| Context | Token | Usage |
|---------|-------|-------|
| Canvas background | `--bg-cream` | Scene clear color |
| Node glow | `--accent-primary` @ 50% opacity | Bloom effect |
| Edge lines | `--text-muted` | Graph connections |
| Particle emissions | `--accent-secondary` | Voice orb ribbons |

---

## Lighting Scheme
Three-point lighting for all 3D scenes:

| Light | Type | Position | Intensity |
|-------|------|----------|-----------|
| Key | Directional | (1, 1, 1) | 1.0 |
| Fill | Ambient | Global | 0.4 |
| Rim | Point | (0, 0, -2) | 0.6 |

HDRI environment: Soft cream studio (compressed, stored in `demo/assets/textures/`)

---

## Glass Gradients
For overlay cards and panels:

```css
.glass-card-3d {
    background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.15) 0%,
        rgba(255, 255, 255, 0.05) 100%
    );
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
}
```

---

## Depth Scale
| Level | Z-Distance | Usage |
|-------|------------|-------|
| 0 | 0 | HTML overlays |
| 1 | 2-5 | Foreground 3D elements |
| 2 | 5-15 | Mid-ground clusters |
| 3 | 15-30 | Background particles |
| 4 | 30+ | Environment (DOF blur) |

---

## Motion Curves
All animations use custom bezier curves for premium feel:

| Motion Type | Curve | Duration |
|-------------|-------|----------|
| Entrance | `cubic-bezier(0.16, 1, 0.3, 1)` | 600ms |
| Exit | `cubic-bezier(0.7, 0, 0.84, 0)` | 400ms |
| Hover | `cubic-bezier(0.4, 0, 0.2, 1)` | 200ms |
| Camera pan | `cubic-bezier(0.25, 0.1, 0.25, 1)` | 800ms |
| Particle float | `linear` | Continuous |

---

## Reduced-Motion Behavior
When `prefers-reduced-motion: reduce`:
- All 3D scenes swap to static SVG/Lottie
- No auto-playing animations
- Camera fixed at default position
- Particles display as static dots

---

## Performance Budgets
| Metric | Target |
|--------|--------|
| Frame rate | 60fps on M1 Air |
| Critical path | \<1.2MB |
| Device pixel ratio | Capped at 1.5 |
| Max particles | 1000 per scene |
| Max draw calls | 50 per frame |
