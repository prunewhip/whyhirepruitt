# Regression Checklist — Vox Amelior Visual Excellence

## Overview
Use this checklist before deploying to verify all 3D visualizations are working correctly.

---

## Pre-Flight Checks

- [ ] Python HTTP server running (`python3 -m http.server 8765`)
- [ ] Browser supports WebGL 2.0
- [ ] Clear browser cache if testing major changes

---

## Module Loading Tests

| Scene Module | Expected Container | Loads? |
|--------------|-------------------|--------|
| hero-orb.js | `#hero-voice-orb` | ☐ |
| nexus-scene.js | `#nexus-graph` | ☐ |
| analytics-scene.js | `#analytics-viz` | ☐ |
| financial-scene.js | `#financial-viz` | ☐ |
| transcripts-scene.js | `#transcripts-viz` | ☐ |
| emotions-scene.js | `#emotions-viz` | ☐ |
| memories-scene.js | `#memories-viz` | ☐ |
| databases-scene.js | `#databases-viz` | ☐ |
| banking-scene.js | `#banking-viz` | ☐ |
| salesforce-scene.js | `#salesforce-viz` | ☐ |
| automation-scene.js | `#automation-viz` | ☐ |

---

## Fallback Tests

| Condition | Expected Behavior | Pass? |
|-----------|-------------------|-------|
| `prefers-reduced-motion: reduce` | SVG fallback renders | ☐ |
| Low GPU tier | SVG fallback renders | ☐ |
| No WebGL context | SVG fallback renders | ☐ |

---

## Performance Checks

| Metric | Target | Actual |
|--------|--------|--------|
| FPS on landing page | ≥55 | ______ |
| FPS on nexus.html | ≥50 | ______ |
| Initial load time | <3s | ______ |
| Memory usage | <200MB | ______ |

---

## Cross-Browser Matrix

| Browser | Version | 3D Works? | Fallback Works? |
|---------|---------|-----------|-----------------|
| Chrome | 90+ | ☐ | ☐ |
| Firefox | 88+ | ☐ | ☐ |
| Safari | 15+ | ☐ | ☐ |
| Edge | 90+ | ☐ | ☐ |

---

## Accessibility Checks

- [ ] Reduced-motion detected correctly
- [ ] No auto-playing animations that can't be paused
- [ ] SVG fallbacks have proper contrast
- [ ] No flashing/strobing effects

---

## Console Error Checks

| Page | No Errors? |
|------|------------|
| index.html | ☐ |
| nexus.html | ☐ |
| analytics.html | ☐ |
| financial-dashboard.html | ☐ |
| transcripts.html | ☐ |
| emotions.html | ☐ |
| memories.html | ☐ |
| databases.html | ☐ |
| banking.html | ☐ |
| salesforce.html | ☐ |
| automation.html | ☐ |

---

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Developer | _____________ | _______ |
| QA | _____________ | _______ |
