# Performance Snapshots — WebGL Scenes

## Overview
Performance budgets and baseline measurements for all 3D visualizations.

---

## Performance Budgets

| Metric | Target | Max |
|--------|--------|-----|
| Frame Time | ≤16.67ms | 20ms |
| FPS | ≥55 | - |
| Draw Calls | ≤30 | 50 |
| Triangles | ≤50k | 100k |
| Memory | ≤150MB | 200MB |

---

## Scene-Specific Budgets

### Hero Orb (index.html)
| Metric | Budget |
|--------|--------|
| Particles | ≤500 |
| Draw Calls | ≤10 |
| Frame Time | ≤10ms |

### Nexus Force Graph (nexus.html)
| Metric | Budget |
|--------|--------|
| Nodes | 22 (fixed) |
| Edges | ≤50 |
| Draw Calls | ≤25 |

### Analytics Bars
| Metric | Budget |
|--------|--------|
| Bars | ≤30 |
| Draw Calls | ≤15 |

### Financial Bands
| Metric | Budget |
|--------|--------|
| Band Vertices | ≤3000 |
| Draw Calls | ≤15 |

### Transcripts Tunnel
| Metric | Budget |
|--------|--------|
| Rings | ≤30 |
| Particles | ≤50 |
| Draw Calls | ≤20 |

### Emotions Aura
| Metric | Budget |
|--------|--------|
| Particles | ≤800 |
| Draw Calls | ≤10 |

### Memories Cards
| Metric | Budget |
|--------|--------|
| Cards | ≤20 |
| Draw Calls | ≤25 |

### Databases Grid
| Metric | Budget |
|--------|--------|
| Nodes | ≤15 |
| Edges | ≤20 |
| Draw Calls | ≤20 |

### Banking Tokens
| Metric | Budget |
|--------|--------|
| Tokens | ≤50 |
| Arcs | ≤10 |
| Draw Calls | ≤20 |

### Salesforce Funnel
| Metric | Budget |
|--------|--------|
| Rings | 5 |
| Deals | ≤15 |
| Draw Calls | ≤25 |

### Automation Workflow
| Metric | Budget |
|--------|--------|
| Nodes | ≤10 |
| Flow Particles | ≤30 |
| Draw Calls | ≤20 |

---

## GPU Tier Limits

```javascript
// From perf.js
GPU_TIER.HIGH:   { maxParticles: 1000, maxDrawCalls: 50, dpr: 2.0 }
GPU_TIER.MEDIUM: { maxParticles: 500,  maxDrawCalls: 30, dpr: 1.5 }
GPU_TIER.LOW:    { maxParticles: 200,  maxDrawCalls: 15, dpr: 1.0 }
```

---

## Baseline Measurements

| Scene | Chrome FPS | Firefox FPS | Safari FPS |
|-------|------------|-------------|------------|
| Hero Orb | TBD | TBD | TBD |
| Nexus Graph | TBD | TBD | TBD |
| Analytics | TBD | TBD | TBD |
| Financial | TBD | TBD | TBD |
| Transcripts | TBD | TBD | TBD |
| Emotions | TBD | TBD | TBD |
| Memories | TBD | TBD | TBD |
| Databases | TBD | TBD | TBD |
| Banking | TBD | TBD | TBD |
| Salesforce | TBD | TBD | TBD |
| Automation | TBD | TBD | TBD |

---

## Optimization Notes

1. **Particle Systems** - Use BufferGeometry with typed arrays
2. **Materials** - Share materials between similar objects
3. **Draw Calls** - Merge geometries where possible
4. **Textures** - Use power-of-2 dimensions, consider KTX2
5. **Animation** - Use requestAnimationFrame with visibility check
