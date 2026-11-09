/**
 * Hero scene: the phone and the G1 glasses turning on a turntable over a quiet voice field (see showcase.js).
 * Their position and size follow a DOM anchor, so CSS owns the responsive layout.
 */

import { mountShowcase } from './showcase.js';

export const mountHero = ({ canvas, deviceAnchor, dragTarget = null, screens, still = null }) =>
  mountShowcase({ canvas, kind: 'hero', anchor: deviceAnchor, dragTarget, screens, field: true, still });
