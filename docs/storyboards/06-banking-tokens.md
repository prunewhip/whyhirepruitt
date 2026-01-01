# Storyboard: Banking Token Streams

## Engine: Banking Dashboard
**Page:** `demo/banking.html`  
**Priority:** HIGH

---

## Visual Direction
Arc diagrams over soft gradients with animated 3D token streams representing payment flows. SLA alerts pulse without jitter.

---

## 3D Treatment

### Primary Element
- **Type:** Arc curves + token particles
- **Geometry:** TubeGeometry for arcs, SphereGeometry for tokens
- **Materials:** Gradient arcs, glowing tokens
- **Animation:** Tokens flow along arc paths

### Token Streams
- Source → Destination flow visualization
- Token color = payment type (credit, debit, transfer)
- Speed = transaction velocity

### Effects
- [ ] Bloom
- [ ] Depth of Field
- [x] Token trails (fading)

### Interaction
- **Hover:** Arc highlight + transaction details
- **Click:** Expand payment rail info
- **Alert:** SLA pulse via CSS overlay (text crisp)

---

## Reduced Motion Alternative

Static arc diagram SVG. Token streams pause. Transaction counts displayed as text.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Tokens | ≤200 |
| Arc segments | ≤50 |
| Draw calls | ≤25 |
| Frame time | ≤16.67ms |
