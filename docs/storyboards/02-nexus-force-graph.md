# Storyboard: Nexus Force Graph

## Engine: Nexus System Overview
**Page:** `demo/nexus.html`  
**Priority:** HIGH

---

## Visual Direction
A living system-of-systems visualization showing all 22 analysis engines as interconnected nodes. Clusters form by category (ML, Financial, Advanced) with glowing edges showing data flow. DOF creates depth and focus.

---

## 3D Treatment

### Primary Element
- **Type:** Force-directed 3D graph
- **Geometry:** SphereGeometry for nodes, BufferGeometry lines for edges
- **Materials:** 
  - Nodes: Glow material with category colors
  - Edges: Line material with gradient opacity
- **Animation:** Force simulation (d3-force-3d), continuous repositioning

### Node Design
- **Size:** Based on engine importance/activity
- **Color:** Category-based (ML=purple, Financial=teal, Advanced=gold)
- **Glow:** Bloom effect on active/selected nodes

### Edge Design
- **Width:** Based on connection strength
- **Opacity:** 0.2 default, 0.8 on hover
- **Animation:** Pulse along edge on data flow

### Effects
- [x] Bloom (medium preset)
- [x] Depth of Field (shallow preset)
- [ ] Shadows
- [x] Post-processing

### Interaction
- **Hover:** Node highlight + connected edges brighten
- **Click:** Open existing detail panel
- **Drag:** Rotate scene (OrbitControls)
- **Scroll:** Zoom in/out

---

## Motion Sequence

### Entrance (0-800ms)
```
Frame 1: Nodes spawn from center, scale 0
Frame 2: Nodes move to initial positions
Frame 3: Edges fade in
Frame 4: Force simulation stabilizes
```

### Idle Loop
```
- Subtle node float (noise-based)
- Edge pulse every 5s (random subset)
- Camera gentle auto-rotate if no interaction
```

### Selection
```
- Camera smoothly dolly to selected node
- Other nodes fade to 30% opacity
- Connected nodes stay at 100%
```

---

## Camera Positions

| State | Position | Target | FOV |
|-------|----------|--------|-----|
| Default | (0, 5, 15) | (0, 0, 0) | 60° |
| Zoomed | (0, 2, 8) | selected | 50° |

---

## Reduced Motion Alternative

**Fallback Type:** Static SVG network diagram

**Description:**
2D force graph rendered with D3.js, nodes as circles with category colors, edges as straight lines. No animation.

---

## Performance Budget

| Metric | Target | Low-tier |
|--------|--------|----------|
| Nodes | 22 | 22 |
| Edges | ~50 | ~50 |
| Particles | 0 | 0 |
| Draw calls | 30 | 20 |
| Frame time | ≤16.67ms | ≤16.67ms |

---

## Data Binding

**Source:** `mock_data.js` → `nexus.engines`

**Fields used:**
- Engine names (node labels)
- Category (node color)
- Connections (edge source/target)
- Status (node state)

---

## Notes

- Tooltip overlays use existing `.engine-card` styles
- Node click opens existing detail panel if present
- Consider using d3-force-3d for physics
- DOF focus follows selected/hovered node
