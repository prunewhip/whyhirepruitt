/**
 * Work scene (desktop): one sticky stage that follows the case studies.
 * The phone spins to the next app's screens; for the glasses project the
 * G1 frames move to the front and the phone steps back.
 */

import { THREE, createStage, loadTexture, damp, reducedMotion } from './stage.js';
import { createPhone, createGlasses, hudTexture } from './devices.js';

const CYCLE = 3.4;

// Where each device rests for each case: [x, y, z, rotX, rotY, scale]
const POSES = {
  phone: {
    vox: [0, 0, 0, 0.06, -0.38, 1],
    narrator: [0, 0, 0, 0.06, 0.38, 1],
    glasses: [0.85, 0.5, -1.6, 0.04, -0.42, 0.78]
  },
  glasses: {
    vox: [-2.6, -1.2, 1.4, 0.2, 0.9, 0.9],
    narrator: [2.8, -1.4, 1.2, 0.2, -0.9, 0.9],
    glasses: [0.05, -0.72, 1.1, 0.18, 0.5, 0.78]
  }
};

export async function mountWork({ canvas, cases }) {
  const stage = createStage(canvas, { fov: 26 });
  const { scene, camera, renderer } = stage;
  camera.position.set(0, 0, 9);

  const phone = createPhone();
  scene.add(phone.group);

  await document.fonts.load('500 34px Geist');
  const glasses = createGlasses({
    hud: hudTexture(['Claude:', 'You have three things', 'today. Want a reminder', 'for the dentist?'])
  });
  scene.add(glasses.group);

  const textures = {};
  await Promise.all(cases.map(async (c) => {
    textures[c.id] = await Promise.all(c.screens.map((url) => loadTexture(url, renderer)));
  }));

  let active = cases[0].id;
  let caseStart = 0;
  let shownIndex = 0;
  let spin = 0;
  let spinTarget = 0;
  const pose = { phone: [...POSES.phone[active]], glasses: [...POSES.glasses[active]] };
  phone.show(textures[active][0], { instant: true });

  // Fit the stage: the phone fills about 62% of the canvas height at any size
  stage.onResize(() => {
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    scene.scale.setScalar((visibleH * 0.62) / phone.height);
  });

  stage.onFrame((t, dt) => {
    const step = dt || 1;
    ['phone', 'glasses'].forEach((key) => {
      const target = POSES[key][active];
      for (let i = 0; i < 6; i++) pose[key][i] = damp(pose[key][i], target[i], 4, step);
    });
    spin = damp(spin, spinTarget, 3.2, step);

    const [px, py, pz, prx, pry, ps] = pose.phone;
    phone.group.position.set(px, py + Math.sin(t * 0.8) * 0.05, pz);
    phone.group.rotation.set(prx, pry + spin + Math.sin(t * 0.35) * 0.05, 0);
    phone.group.scale.setScalar(ps);

    const [gx, gy, gz, grx, gry, gs] = pose.glasses;
    glasses.group.position.set(gx, gy + Math.sin(t * 0.9 + 1.4) * 0.04, gz);
    glasses.group.rotation.set(grx, gry + Math.sin(t * 0.4) * 0.05, -0.04);
    glasses.group.scale.setScalar(gs);

    // Cycle this case's screens; swap halfway through a spin so the change is hidden
    const list = textures[active];
    const index = Math.floor((t - caseStart) / CYCLE) % list.length;
    if (index !== shownIndex && dt) {
      shownIndex = index;
      phone.show(list[index]);
    }
    phone.update(dt);
  });

  if (reducedMotion()) stage.renderOnce(1);
  else stage.start();

  let elapsed = 0;
  stage.onFrame((t) => { elapsed = t; });

  return {
    /** Switch the stage to a case study ("vox", "narrator" or "glasses"). */
    setCase(id) {
      if (id === active || !textures[id]) return;
      active = id;
      caseStart = elapsed;
      shownIndex = 0;
      spinTarget += Math.PI * 2;
      // Show the new app's first screen as the phone turns its back to us
      setTimeout(() => phone.show(textures[id][0]), reducedMotion() ? 0 : 280);
      if (reducedMotion()) {
        spin = spinTarget;
        stage.renderOnce(elapsed);
      }
    }
  };
}
