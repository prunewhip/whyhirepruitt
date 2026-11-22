/**
 * The home page's opening scene, built to look like a product photograph that moves: Even Realities G1 glasses
 * floating in a dark studio, the green display glowing in the lenses.
 *
 * What makes it read as real, and where each part lives:
 *   light      a photo studio of long softbox strips for every reflection, slowly turning so glints travel across
 *              the frame and lenses; a warm key, a cool rim behind and a soft fill
 *   materials  refracting glass lenses (transmission, IOR 1.5), a satin frame with micro-roughness, brushed hinges
 *   camera     a slow drift and the pointer's parallax, both damped; a turntable that lingers on the front
 *   floor      a polished black floor reflecting the glasses, a soft contact shadow under them
 *   air        dust drifting through the light, brightest near the key
 *   film       bloom on the display and the brightest glints, AgX tone mapping, vignette, fine grain
 *
 * Runs only while on screen and the tab is visible. Measures its own frame time and steps down (resolution, then
 * bloom) on slower devices so it stays smooth. mountHeroReal({ manual: true }) renders stills on demand for the bake
 * tool (tools/brand/devices.html?kind=real&t=…).
 */

import { THREE, damp, reducedMotion, createMirrorFloor, createContactShadow, studioEnvironment } from './stage.js';
import { createGlasses, hudCard } from './devices.js';
import { EffectComposer } from '../../assets/vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from '../../assets/vendor/three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../assets/vendor/three/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../assets/vendor/three/postprocessing/OutputPass.js';
import { ShaderPass } from '../../assets/vendor/three/postprocessing/ShaderPass.js';
import { RGBELoader } from '../../assets/vendor/three/loaders/RGBELoader.js';

// What the glasses show, one card every few seconds; each card types in like a reply on the real display
const HUD = [
  ['Claude Code · glasses', '> make a kitchen timer', 'Done. 64 lines,', '3 tests pass.'],
  ['Linux · XFCE · :2', 'Terminal   Files   Web', '640 × 480', '16 greys · 30 fps'],
  ['Live · captions', 'Sam: the demo moved', 'to 3, not 2.', 'Bring the glasses.'],
  ['Look up · 9:41', '72° and sunny', 'Next: call with Sam', 'Battery 84% · 81%']
];
const CARD_SECONDS = 4.6;

/** Fine noise for roughness: real surfaces are never perfectly even, and the variation is what sells them. */
function grainTexture(size = 256, seed = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + rand() * 70;
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

/** A soft round sprite for the dust. */
function dotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// Vignette, a whisper of lens fringing toward the corners, and grain that moves: the last 5% of a photograph
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.55 }, uGrain: { value: 0.035 }, uFringe: { value: 0.0007 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uFringe;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * r2 * uFringe * 40.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      c *= mix(1.0, smoothstep(0.95, 0.15, r2 * 2.2), uVignette);
      float n = hash(vUv * vec2(1931.0, 1187.0) + fract(uTime * 7.31)) - 0.5;
      c += n * uGrain * (1.0 - c * 0.6);
      gl_FragColor = vec4(c, 1.0);
    }
  `
};

// The studio behind: near-black, a soft pool of light where the glasses float, dithered so the gradient never bands
function backdrop() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uAspect: { value: 1 }, uCenter: { value: new THREE.Vector2(0.62, 0.5) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAspect;
      uniform vec2 uCenter;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main() {
        vec2 p = vUv - uCenter;
        p.x *= uAspect;
        float pool = exp(-dot(p, p) * 2.6);
        float floorGlow = exp(-pow((vUv.y - 0.3) * 5.0, 2.0)) * exp(-pow(p.x * 1.4, 2.0));
        vec3 base = vec3(0.0016, 0.0024, 0.0024);
        vec3 c = base + vec3(0.016, 0.034, 0.030) * pool + vec3(0.005, 0.012, 0.009) * floorGlow;
        c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    depthWrite: false,
    depthTest: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

export async function mountHeroReal({ canvas, manual = false, envUrl = null, screensBase = '', center = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  let dpr = manual ? maxDpr : Math.min(maxDpr, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x020404, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  scene.add(backdrop());

  // Light: the HDR for reflections, then a few lamps that shape the form
  // The site's own studio (long softbox strips on dark walls) draws clean streaks down the frame and across the
  // glass; a real HDR (envUrl) is richer but its square lamps sit right under the display text
  const pmrem = new THREE.PMREMGenerator(renderer);
  let env = null;
  if (envUrl) {
    try {
      const hdr = await new RGBELoader().loadAsync(screensBase + envUrl);
      env = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
    } catch (error) {
      console.warn('Studio HDR unavailable:', error);
    }
  }
  scene.environment = env || pmrem.fromScene(studioEnvironment(), 0.02).texture;
  pmrem.dispose();
  scene.environmentIntensity = 1.6;

  // Only one lamp: the rim, high behind, drawing a bright line round the frame against the dark. The key and fill
  // are the studio's softboxes (in the environment), so highlights take a softbox's shape, never a pinpoint
  const rim = new THREE.DirectionalLight(0xa8f0ff, 5);
  rim.position.set(-2, 3, -5);
  rim.layers.enableAll();
  scene.add(rim);

  // Materials a photographer would recognise
  const grain = grainTexture();
  const materials = {
    frame: new THREE.MeshPhysicalMaterial({
      color: 0x202428, metalness: 0.68, roughness: 0.3, roughnessMap: grain,
      clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 1.25
    }),
    hinge: new THREE.MeshPhysicalMaterial({ color: 0xb9bfc5, metalness: 1, roughness: 0.2, roughnessMap: grain, envMapIntensity: 1.4 }),
    touch: new THREE.MeshPhysicalMaterial({ color: 0x41464c, metalness: 0.4, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    // Real glass: it bends what's behind it and keeps a faint blue cast in its thickness
    lens: new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.06, ior: 1.5,
      attenuationColor: new THREE.Color(0xcfe3ff), attenuationDistance: 0.6, specularIntensity: 0.7,
      clearcoat: 0.45, clearcoatRoughness: 0.03, envMapIntensity: 0.9, transparent: true
    }),
    coat: null
  };

  const hud = hudCard({ charsPerSecond: 26 });
  const glasses = createGlasses({ hud: hud.texture, materials, hudGain: 2.6 });
  const rig = new THREE.Group();
  rig.add(glasses.group);
  scene.add(rig);


  // Floor: polished black with the reflection fading off, and a soft shadow right under the glasses
  const FLOOR_Y = -0.78;
  const mirror = createMirrorFloor(renderer, { strength: 0.32, fade: 0.9, resolution: 0.5 });
  mirror.mesh.position.y = FLOOR_Y;
  mirror.reflect(glasses.group);
  scene.add(mirror.mesh);
  const shadow = createContactShadow({ opacity: 0.55, color: '0, 0, 0' });
  shadow.scale.set(2.8, 1.4, 1);
  shadow.position.y = FLOOR_Y + 0.002;
  scene.add(shadow);

  // Dust in the air, catching the key light
  const DUST = 380;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < DUST; i++) {
    dustPos.set([(rnd() - 0.5) * 7, rnd() * 3.2 - 0.8, (rnd() - 0.5) * 5 - 0.5], i * 3);
    dustSeed[i] = rnd();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.022, map: dotTexture(), transparent: true, opacity: 0.55, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0xcfe9df, sizeAttenuation: true
  }));
  const dustBase = dustPos.slice();
  scene.add(dust);

  // Out of focus, close to the lens: a few big soft discs drifting past, the way a macro shot catches dust
  const BOKEH = 14;
  const bokehPos = new Float32Array(BOKEH * 3);
  for (let i = 0; i < BOKEH; i++) bokehPos.set([(rnd() - 0.5) * 4.5, (rnd() - 0.5) * 2.4 + 0.4, 2.2 + rnd() * 1.6], i * 3);
  const bokehBase = bokehPos.slice();
  const bokehGeo = new THREE.BufferGeometry();
  bokehGeo.setAttribute('position', new THREE.BufferAttribute(bokehPos, 3));
  const bokeh = new THREE.Points(bokehGeo, new THREE.PointsMaterial({
    size: 0.32, map: dotTexture(), transparent: true, opacity: 0.07, depthWrite: false,
    blending: THREE.AdditiveBlending, color: 0x9fe9c8, sizeAttenuation: true
  }));
  scene.add(bokeh);

  // A shaft of the key light through faint haze, brightest at its source and gone by the floor
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 1.5, 7, 48, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0.055 } },
      vertexShader: /* glsl */ `
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main() {
          vY = position.y / 7.0 + 0.5;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vY; varying vec3 vN; varying vec3 vV;
        void main() {
          float edge = pow(abs(dot(vN, vV)), 1.6);
          float a = uOpacity * edge * smoothstep(0.0, 0.55, vY);
          gl_FragColor = vec4(vec3(0.85, 1.0, 0.94) * a, a);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    })
  );
  shaft.position.set(1.9, 2.0, -0.6);
  shaft.rotation.z = 0.42;
  scene.add(shaft);

  // The film: render, bloom the brightest light, tone map, then vignette and grain
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.62, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  // Framing: on wide screens the glasses sit right of the headline; on tall ones, lower and centred
  let wide = true;
  const resize = () => {
    const box = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width));
    const h = Math.max(1, Math.round(box.height));
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w * dpr * 0.5, h * dpr * 0.5);
    camera.aspect = w / h;
    wide = camera.aspect >= 1.05;
    camera.fov = wide ? 25 : 34;
    camera.updateProjectionMatrix();
    scene.children[0].material.uniforms.uAspect.value = camera.aspect;
    scene.children[0].material.uniforms.uCenter.value.set(wide && !center ? 0.76 : 0.5, wide ? 0.48 : 0.3);
    if (!running) frame(elapsed, 0);
  };

  // Pointer parallax, damped
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  if (!manual) addEventListener('pointermove', onPointer, { passive: true });

  let card = -1;
  function frame(t, dt) {
    const calm = reducedMotion() && !manual ? 0.25 : 1;
    pointer.x = dt ? damp(pointer.x, pointer.tx, 2.5, dt) : pointer.tx;
    pointer.y = dt ? damp(pointer.y, pointer.ty, 2.5, dt) : pointer.ty;

    // Turntable that lingers on the front: a slow sway with a little of the pointer
    const tt = t * calm;
    // Centred on a three-quarter view (the way product shots show glasses), swaying either side of it
    rig.rotation.y = (wide && !center ? -0.48 : wide ? -0.62 : -0.34) + Math.sin(tt * 0.3) * (wide ? 0.18 : 0.2) + pointer.x * 0.2;
    rig.rotation.x = 0.06 + pointer.y * 0.05;
    glasses.group.position.y = Math.sin(tt * 0.9) * 0.035;
    // Wide screens: the glasses fill the right half, clear of the headline
    rig.position.set(center ? 0 : wide ? 1.38 : -0.12, wide ? 0.05 : -0.95, 0);
    rig.scale.setScalar(center ? 1.3 : wide ? 0.98 : 1.12);
    shadow.position.x = rig.position.x;
    shadow.material.opacity = 0.5 - glasses.group.position.y * 2;

    // Camera: a breath of drift, looking at the glasses
    camera.position.set(Math.sin(tt * 0.11) * 0.12 + pointer.x * 0.2 + (wide && !center ? 0.3 : 0), 0.7 + Math.sin(tt * 0.07) * 0.07 - pointer.y * 0.15, wide ? (center ? 5.4 : 6.2) : 8.2);
    camera.lookAt(wide && !center ? 0.35 : 0, wide ? -0.08 : 0.25, 0);

    // Reflections travel: the studio turns slowly around the glasses
    scene.environmentRotation.y = tt * 0.05;

    // The display: a new card every few seconds, typed in
    const n = Math.floor(t / CARD_SECONDS);
    if (n !== card) {
      card = n;
      hud.show(HUD[n % HUD.length], n * CARD_SECONDS + 0.35);
    }
    hud.update(t);

    // Dust drifts up and sideways, wrapping round
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      const k = dustSeed[i];
      p[i * 3] = dustBase[i * 3] + Math.sin(tt * (0.1 + k * 0.2) + k * 40) * 0.25;
      p[i * 3 + 1] = ((dustBase[i * 3 + 1] + 0.8 + tt * (0.02 + k * 0.03)) % 3.2) - 0.8;
      p[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(tt * 0.13 + k * 17) * 0.2;
    }
    dustGeo.attributes.position.needsUpdate = true;
    const b = bokehGeo.attributes.position.array;
    for (let i = 0; i < BOKEH; i++) {
      b[i * 3] = bokehBase[i * 3] + Math.sin(tt * 0.07 + i) * 0.4 - pointer.x * 0.25;
      b[i * 3 + 1] = bokehBase[i * 3 + 1] + Math.cos(tt * 0.05 + i * 2.3) * 0.25 + pointer.y * 0.15;
    }
    bokehGeo.attributes.position.needsUpdate = true;

    film.uniforms.uTime.value = t;
    composer.render(dt);
  }

  // Loop, only while it can be seen; steps quality down if frames run long
  let running = false;
  let onScreen = false;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let slow = 0;
  let measured = 0;
  const tick = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    frame(elapsed, dt);
    // After the first second, judge the frame time over a two-second window
    if (elapsed > 1) {
      measured++;
      if (dt > 0.024) slow++;
      if (measured === 120) {
        if (slow > 50 && dpr > 1) {
          dpr = Math.max(1, dpr - 0.5);
          renderer.setPixelRatio(dpr);
          resize();
        } else if (slow > 50 && bloom.enabled) {
          bloom.enabled = false;
        }
        measured = 0;
        slow = 0;
      }
    }
    raf = requestAnimationFrame(tick);
  };
  const sync = () => {
    const should = !manual && onScreen && !document.hidden;
    if (should === running) return;
    running = should;
    if (running) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else cancelAnimationFrame(raf);
  };

  new ResizeObserver(resize).observe(canvas.parentElement);
  if (!manual) {
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    }).observe(canvas);
    document.addEventListener('visibilitychange', sync);
  }
  resize();

  return {
    /** Renders the scene as it is at `t` seconds (for stills). */
    renderAt(t) {
      elapsed = t;
      card = -1;
      frame(t, 0);
    },
    start() {
      onScreen = true;
      sync();
    }
  };
}
