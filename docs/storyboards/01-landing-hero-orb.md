# Storyboard: Landing Hero Voice Orb

## Engine: Landing Page
**Page:** `demo/index.html`  
**Priority:** HIGH

---

## Visual Direction
An ethereal voice orb that responds to microphone input, symbolizing "voice → insight". The orb pulses with energy, surrounded by flowing particle ribbons that represent data transformation.

---

## 3D Treatment

### Primary Element
- **Type:** Icosahedron mesh with particle system
- **Geometry:** IcosahedronGeometry(0.8, 2) for orb core
- **Materials:** Glow material (accent color, additive blending)
- **Animation:** Scale pulse (1.0 - 1.1), slow rotation

### Particle System
- **Count:** 500 particles (300 on low-tier)
- **Distribution:** Spherical shell, radius 3-5
- **Motion:** Orbital drift + noise displacement
- **Colors:** Primary (purple) + Accent (teal), alternating

### Effects
- [x] Bloom (subtle preset)
- [ ] Depth of Field
- [ ] Shadows
- [x] Additive blending for particles

### Interaction
- **Hover:** Slight camera zoom (10 → 8)
- **Click:** CTA buttons remain HTML overlay
- **Mic Input:** Particle velocity increases with amplitude

---

## Motion Sequence

### Entrance (0-600ms)
```
Frame 1: Orb at scale 0.5, opacity 0
Frame 2: Scale to 1.0, opacity 1
Frame 3: Particles fade in from center
```

### Idle Loop
```
- Orb rotation: Y-axis at 0.2 rad/s
- Orb pulse: scale 1.0-1.1 at 2Hz
- Particles: orbital motion + vertical noise
```

### Mic Active
```
- Particle velocity: 1x → 3x based on amplitude
- Orb glow: intensity increases with input
- Ribbon trails: extend outward
```

---

## Camera Positions

| State | Position | Target | FOV |
|-------|----------|--------|-----|
| Default | (0, 0, 10) | (0, 0, 0) | 60° |
| Hover | (0, 0, 8) | (0, 0, 0) | 60° |

---

## Reduced Motion Alternative

**Fallback Type:** SVG with radial gradient

**Description:**
Static circular gradient (teal center → transparent edge) with centered "WebGL Ready" or brand icon. No animation.

---

## Performance Budget

| Metric | Target | Low-tier |
|--------|--------|----------|
| Particles | 500 | 200 |
| Draw calls | 15 | 10 |
| Triangles | 5K | 2K |
| Frame time | ≤16.67ms | ≤16.67ms |

---

## Data Binding

**Source:** Microphone input (Web Audio API)

**Fields used:**
- Audio amplitude (real-time)
- Frequency data (optional visualization)

**Fallback:** Sine wave simulation when mic denied

---

## Notes

- Request microphone permission on user interaction only
- Gracefully degrade if getUserMedia unavailable
- CTA buttons must remain HTML for accessibility
- Preload this scene (critical path)
