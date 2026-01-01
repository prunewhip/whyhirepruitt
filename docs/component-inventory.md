# Demo Pages Component Inventory

## Overview
Audit of all demo pages for layout patterns, components, and 3D integration points.

---

## Page Summary

| Page | Size | Hero Area | Primary Viz | 3D Priority |
|------|------|-----------|-------------|-------------|
| index.html | 12KB | Yes - landing | Voice orb | HIGH |
| nexus.html | 64KB | Analysis workspace | Engine graph | HIGH |
| analytics.html | 14KB | KPI cards | Bar/line charts | HIGH |
| financial-dashboard.html | 42KB | Metrics panel | Forecast charts | HIGH |
| ml_dashboard.html | 31KB | Model metrics | Confusion matrix | MEDIUM |
| transcripts.html | 17KB | Transcript view | Waveform | MEDIUM |
| emotions.html | 90KB | Session timeline | Emotion wheel | MEDIUM |
| memories.html | 22KB | Memory cards | Card grid | MEDIUM |
| databases.html | 40KB | Table view | Schema graph | MEDIUM |
| banking.html | 45KB | Transaction flow | Arc diagram | HIGH |
| salesforce.html | 1KB | Minimal | Funnel | HIGH |
| automation.html | 14KB | Flow canvas | Node links | HIGH |
| settings.html | 32KB | Settings panels | None | LOW |
| login.html | 11KB | Auth form | None | LOW |
| admin_qa.html | 15KB | QA dashboard | None | LOW |

---

## Shared Components Identified

### Layout Patterns
- `.glass-card` - Frosted glass card containers
- `.stat-card` - Metric display cards
- `.panel` - Section containers
- `.hero-section` - Top landing areas

### Navigation
- `.nav-header` - Top navigation bar
- `.sidebar-nav` - Left sidebar (some pages)
- `.tab-nav` - Tab interfaces

### Visualizations (Existing)
- Chart.js - Bar, line, pie charts
- Plotly.js - 3D scatter, surface, heatmaps
- ECharts - Gauges, radar charts
- Custom SVG - Various decorative elements

### Motion (Current)
- CSS transitions on hover
- Accordion animations
- Modal show/hide
- Loading spinners

---

## 3D Integration Points (scene-shell locations)

### HIGH Priority (Month 2-3)
| Page | Container ID | Placement | Replace |
|------|--------------|-----------|---------|
| index.html | `hero-voice-orb` | Hero section | Static gradient |
| nexus.html | `nexus-graph` | Engine overview | 2D engine cards |
| analytics.html | `analytics-viz` | KPI section | Static charts |
| financial-dashboard.html | `financial-viz` | Forecast panel | 2D line charts |

### MEDIUM Priority (Month 4)
| Page | Container ID | Placement | Replace |
|------|--------------|-----------|---------|
| transcripts.html | `transcripts-viz` | Waveform area | 2D waveform |
| emotions.html | `emotions-viz` | Session view | Emoji wheel |
| memories.html | `memories-viz` | Card area | Static grid |
| databases.html | `databases-viz` | Schema section | Static diagram |

### HIGH Priority (Month 5)
| Page | Container ID | Placement | Replace |
|------|--------------|-----------|---------|
| banking.html | `banking-viz` | Transaction flow | Arc SVG |
| salesforce.html | `salesforce-viz` | Pipeline | Minimal |
| automation.html | `automation-viz` | Flow canvas | 2D nodes |

### LOW Priority (Month 6)
| Page | Notes |
|------|-------|
| settings.html | Glass depth only |
| login.html | Subtle background |
| admin_qa.html | Minimal treatment |

---

## CSS Token Usage

All pages use tokens from:
- `css/design-system.css` - Core tokens
- `demo/assets/css/vox-amelior.css` - Component styles

### Key Tokens for 3D
```css
--bg-cream: #faf8f5;     /* Scene backgrounds */
--bg-warm: #f5f0e8;      /* Fallback surfaces */
--radius-lg: 1rem;       /* Card corners */
--shadow-glass: ...;     /* Elevation */
```

---

## Recommendations

1. **Standardize scene-shell styling** - Add to vox-amelior.css
2. **Lazy load all 3D modules** - Use IntersectionObserver
3. **Preload hero scene** - Critical path for landing
4. **Share materials** - One materials.js for all pages
5. **Unified fallback** - Lottie library in assets/lottie/
