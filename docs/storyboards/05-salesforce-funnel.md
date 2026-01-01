# Storyboard: Salesforce Pipeline Funnel

## Engine: Salesforce CRM
**Page:** `demo/salesforce.html`  
**Priority:** HIGH

---

## Visual Direction
3D funnel with orbiting deal nodes. Stage progression animates on scroll. Deal size visualized by orbit radius.

---

## 3D Treatment

### Primary Element
- **Type:** Funnel mesh with deal particles
- **Geometry:** ConeGeometry (inverted), SphereGeometry for deals
- **Materials:** Glass-like funnel, glowing deal nodes
- **Animation:** Deals orbit their stage level

### Funnel Stages
- Lead → Qualified → Proposal → Negotiation → Closed
- Each stage = horizontal ring on funnel
- Deals orbit at their stage height

### Effects
- [x] Bloom (medium)
- [ ] Depth of Field
- [x] Stage color coding

### Interaction
- **Scroll:** Camera moves through funnel stages
- **Hover:** Deal tooltip with value/name
- **Click:** Open deal detail panel

---

## Camera Positions

| State | Position | Notes |
|-------|----------|-------|
| Overview | (0, 15, 20) | Full funnel view |
| Stage focus | (0, stage.y, 8) | Zoomed to stage |

---

## Reduced Motion Alternative

2D funnel SVG with deal counts per stage. No animation.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Deal nodes | ≤100 |
| Draw calls | ≤30 |
| Frame time | ≤16.67ms |
