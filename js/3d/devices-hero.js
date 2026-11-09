/**
 * The earlier hero scene, kept for the tools that bake it (the product tour, the share image): a voice field
 * rolling toward the viewer, a phone cycling through real screens from the three apps, and G1-style glasses with
 * their HUD text. Placement follows two DOM anchors, so CSS owns the responsive layout.
 */

import { THREE, createStage, loadTexture, anchorToWorld, damp, reducedMotion } from './stage.js';
import { createPhone, createGlasses, hudTexture } from './devices.js';
import { createVoiceField } from './voice-field.js';

const CYCLE = 3.8;
// Glasses world width at scale 1 (both lenses, bridge and hinges)
const GLASSES_WIDTH = 1.9;

export async function mountHero({ canvas, phoneAnchor, glassesAnchor, screens, still = null }) {
  const small = matchMedia('(max-width: 860px)').matches;
  const stage = createStage(canvas, { fov: 28 });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0, 12);

  const field = createVoiceField({ rows: small ? 46 : 78, cols: small ? 150 : 260, width: 24, depth: 10 });
  const fieldGroup = new THREE.Group();
  fieldGroup.add(field.mesh);
  fieldGroup.rotation.x = 0.4;
  scene.add(fieldGroup);

  const phone = createPhone();
  scene.add(phone.group);

  await document.fonts.load('500 34px Geist');
  const glasses = createGlasses({
    hud: hudTexture(['You have three things today:', '– 10:00 stand-up', '– 13:30 dentist', '– 18:00 dinner'])
  });
  scene.add(glasses.group);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (event) => {
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const base = { phone: new THREE.Vector3(), glasses: new THREE.Vector3() };
  stage.onResize(() => {
    const p = anchorToWorld(phoneAnchor, canvas, camera, 0);
    phone.group.visible = p.visible;
    phone.group.scale.setScalar(p.height / phone.height);
    base.phone.set(p.x, p.y, 0);

    const g = anchorToWorld(glassesAnchor, canvas, camera, 1.2);
    glasses.group.visible = g.visible;
    glasses.group.scale.setScalar(g.width / GLASSES_WIDTH);
    base.glasses.set(g.x, g.y, 1.2);

    // The field sits along the bottom of the hero, under the copy
    fieldGroup.position.set(0, -p.visibleH * 0.42, -2.5);
  });

  const textures = await Promise.all(screens.map((url) => loadTexture(url, renderer)));
  phone.show(textures[0], { instant: true });
  let shown = 0;

  stage.onFrame((t, dt) => {
    field.uniforms.uTime.value = t;

    pointer.x = damp(pointer.x, pointer.tx, 3, dt || 1);
    pointer.y = damp(pointer.y, pointer.ty, 3, dt || 1);

    const bob = Math.sin(t * 0.8) * 0.06;
    phone.group.position.set(base.phone.x, base.phone.y + bob, base.phone.z);
    phone.group.rotation.set(0.08 + pointer.y * 0.08, -0.42 + pointer.x * 0.22 + Math.sin(t * 0.35) * 0.06, 0.02);

    const gbob = Math.sin(t * 0.9 + 1.7) * 0.05;
    glasses.group.position.set(base.glasses.x, base.glasses.y + gbob, base.glasses.z);
    glasses.group.rotation.set(0.14 + pointer.y * 0.06, 0.62 + pointer.x * 0.18 + Math.sin(t * 0.4 + 1) * 0.05, -0.06);

    const next = Math.floor(t / CYCLE) % textures.length;
    if (next !== shown && dt) {
      shown = next;
      phone.show(textures[next]);
    }
    phone.update(dt);
  });

  if (still !== null) {
    // Deterministic frame for pre-rendering and the video
    stage.renderOnce(still);
  } else if (reducedMotion()) {
    stage.renderOnce(2);
  } else {
    stage.start();
  }
  return stage;
}
