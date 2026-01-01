# Storyboard Template

## Engine: {ENGINE_NAME}
**Page:** `demo/{page}.html`  
**Priority:** HIGH | MEDIUM | LOW

---

## Visual Direction
Brief description of the visual goal and emotional intent.

---

## 3D Treatment

### Primary Element
- **Type:** (graph, particles, surface, mesh)
- **Geometry:** 
- **Materials:** 
- **Animation:** 

### Effects
- [ ] Bloom
- [ ] Depth of Field
- [ ] Shadows
- [ ] Post-processing

### Interaction
- **Hover:** 
- **Click:** 
- **Scroll:** 

---

## Motion Sequence

### Entrance (0-600ms)
```
Frame 1: Initial state (opacity: 0, scale: 0.9)
Frame 2: Fade in, scale up
Frame 3: Elements populate
```

### Idle Loop
```
- Subtle rotation/float
- Particle drift
- Glow pulse
```

### Exit/Transition
```
- Fade out on scroll
- Camera dolly on selection
```

---

## Camera Positions

| State | Position | Target | FOV |
|-------|----------|--------|-----|
| Default | (0, 0, 10) | (0, 0, 0) | 60° |
| Hover | (0, 0, 8) | selected | 60° |
| Detail | (0, 2, 5) | selected | 50° |

---

## Reduced Motion Alternative

**Fallback Type:** SVG | Lottie | Static

**Description:**


---

## Performance Budget

| Metric | Target |
|--------|--------|
| Particles | ≤500 |
| Draw calls | ≤30 |
| Triangles | ≤50K |
| Frame time | ≤16.67ms |

---

## Data Binding

**Source:** `mock_data.js` path

**Fields used:**
- 
- 

---

## Notes

Additional implementation notes.
