# Storyboard: Financial Forecast Bands

## Engine: Financial Dashboard
**Page:** `demo/financial-dashboard.html`  
**Priority:** HIGH

---

## Visual Direction
Layered 3D forecast bands showing revenue/EBITDA projections with scrubbable timeline. Annotations highlight key inflection points.

---

## 3D Treatment

### Primary Element
- **Type:** Layered ribbon surfaces
- **Geometry:** PlaneGeometry with vertex displacement
- **Materials:** Gradient materials with transparency
- **Animation:** Timeline scrubbing morphs surface

### Timeline Control
- HTML slider using existing styles
- Scrubbing updates surface vertices
- Annotations as HTML overlays (crisp text)

### Effects
- [x] Bloom (subtle)
- [ ] Depth of Field
- [x] Edge glow on selected band

### Interaction
- **Scrub:** Timeline slider morphs data
- **Hover:** Band highlight + forecast value
- **Click:** Expand annotation detail

---

## Camera Positions

| State | Position | Target |
|-------|----------|--------|
| Default | (0, 3, 12) | (0, 0, 0) |
| Detail | (0, 1, 6) | focused band |

---

## Reduced Motion Alternative

2D layered area chart with CSS transitions. Static gradient fills.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Band vertices | ≤3000 |
| Draw calls | ≤15 |
| Frame time | ≤16.67ms |
