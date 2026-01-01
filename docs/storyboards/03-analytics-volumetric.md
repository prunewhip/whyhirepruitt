# Storyboard: Analytics Volumetric Visualization

## Engine: Analytics Dashboard
**Page:** `demo/analytics.html`  
**Priority:** HIGH

---

## Visual Direction
Story-first BI with 3D volumetric bars and streamgraphs that respond to scroll. Camera transitions between KPIs create a cinematic data narrative.

---

## 3D Treatment

### Primary Element
- **Type:** Volumetric bar charts + stream surfaces
- **Geometry:** BoxGeometry for bars, custom ExtrudedGeometry for streams
- **Materials:** Glass-like with subtle refraction
- **Animation:** Scroll-driven camera rails

### Effects
- [x] Bloom (subtle)
- [ ] Depth of Field
- [ ] Shadows
- [x] Parallax scroll

### Interaction
- **Scroll:** Camera dolly between chart sections
- **Hover:** Bar highlight + value tooltip
- **Click:** Drill down to detail view

---

## Camera Positions

| State | Position | Target | Notes |
|-------|----------|--------|-------|
| Section 1 | (0, 5, 15) | (0, 0, 0) | Overview |
| Section 2 | (5, 3, 10) | (0, 0, 0) | Revenue focus |
| Section 3 | (-5, 2, 8) | (0, 0, 0) | Trend focus |

---

## Reduced Motion Alternative

Static chart PNG fallback for print/reduced-motion. SVG bar charts with CSS transitions.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Bars | ≤50 |
| Stream vertices | ≤2000 |
| Draw calls | ≤25 |
| Frame time | ≤16.67ms |
