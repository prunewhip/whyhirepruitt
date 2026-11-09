/**
 * Shared Three.js stage: renderer, studio lighting, render loop and DOM anchoring.
 * Every scene on the site is built on this so quality settings live in one place.
 */

import * as THREE from '../../assets/vendor/three/three.module.min.js';

export { THREE };

// Objects on this layer also show in the glossy floor's reflection (see createMirrorFloor)
export const REFLECTED = 1;

/**
 * A photo studio to reflect: a dark grey sweep, brighter overhead, lit by softboxes. The tall strips and the overhead
 * box are what draw the long, crisp highlights down a phone's edges and across glass, the look of a product shot.
 * The walls stay dark so glossy black stays deep and only the lights show in it (pale walls read as grey plastic).
 */
function studioEnvironment() {
  const scene = new THREE.Scene();
  const sweep = new THREE.SphereGeometry(20, 48, 24);
  const position = sweep.attributes.position;
  const colors = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) / 20;
    const v = y > 0 ? THREE.MathUtils.lerp(0.16, 0.42, y) : THREE.MathUtils.lerp(0.16, 0.04, -y);
    colors.push(v, v, v * 0.97);
  }
  sweep.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(sweep, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const softbox = (w, h, intensity, [x, y, z]) => {
    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    box.position.set(x, y, z);
    box.lookAt(0, 0, 0);
    scene.add(box);
  };
  softbox(14, 9, 1.2, [0, 15, 1]); // a broad scrim straight overhead: a bright line along every top edge
  softbox(8, 4.5, 5, [2.5, 9, 5]); // key: a large box overhead, front right
  softbox(1.3, 13, 9, [-9, 1.5, 2.5]); // tall strip, left
  softbox(1.3, 13, 7, [9, 1, -3]); // tall strip, right and behind
  softbox(13, 1.1, 6, [0, 6, -9]); // rim strip, behind
  softbox(7, 0.5, 3, [-2.5, 3.5, 9]); // a thin strip behind the camera: the glint across glass
  return scene;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Creates a renderer bound to `canvas`, sized to the canvas's parent element.
 * The loop only runs while the canvas is on screen and the tab is visible.
 */
export function createStage(canvas, { fov = 30, maxDpr = 2, exposure = 1.05, toneMapping = THREE.NeutralToneMapping, manual = false, honorReducedMotion = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  // Supersample standard-density screens (1.5×) for cleaner edges; high-density screens are already sharp
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.5), maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Khronos PBR Neutral keeps product colours true (ACES shifts hues), so materials look as designed
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // Studio reflections give metal and glass their gloss; a low blur keeps the softbox highlights crisp
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.015).texture;
  pmrem.dispose();

  // A soft rim light picks out the edges of the metal
  const rim = new THREE.DirectionalLight(0xeef3ef, 1.8);
  rim.position.set(-3, 2, -2);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  [rim, key].forEach((light) => {
    light.layers.enable(REFLECTED);
    scene.add(light);
  });

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const frameCallbacks = new Set();
  const resizeCallbacks = new Set();
  let width = 1;
  let height = 1;
  let running = false;
  let onScreen = false;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;

  const resize = () => {
    const box = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, Math.round(box.width));
    height = Math.max(1, Math.round(box.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resizeCallbacks.forEach((cb) => cb({ width, height }));
    if (!running) renderOnce();
  };

  const tick = (now) => {
    // rAF timestamps can predate the performance.now() taken when the loop resumed
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    frameCallbacks.forEach((cb) => cb(elapsed, dt));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    // Stills (manual) never run the loop; everything else runs only while it can be seen
    // A scene can opt to keep a gentle motion going under reduced motion (it slows itself down instead)
    const shouldRun = !manual && onScreen && !document.hidden && (!honorReducedMotion || !reducedMotion());
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  };

  function renderOnce(t = elapsed) {
    frameCallbacks.forEach((cb) => cb(t, 0));
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(canvas.parentElement);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();

  return {
    THREE,
    renderer,
    scene,
    camera,
    get size() {
      return { width, height };
    },
    onFrame: (cb) => frameCallbacks.add(cb),
    onResize: (cb) => {
      resizeCallbacks.add(cb);
      cb({ width, height });
    },
    renderOnce,
    start: () => {
      onScreen = true;
      sync();
    }
  };
}

const textureLoader = new THREE.TextureLoader();

/** Loads an sRGB texture with the best filtering the GPU offers. */
export function loadTexture(url, renderer) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      resolve(tex);
    }, undefined, reject);
  });
}

/**
 * Where a DOM element's center lands on the plane z = `planeZ`, in world units,
 * plus the world height its box covers. Lets CSS decide where 3D objects sit.
 */
export function anchorToWorld(el, canvas, camera, planeZ = 0) {
  const c = canvas.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const nx = ((r.left + r.width / 2 - c.left) / c.width) * 2 - 1;
  const ny = -(((r.top + r.height / 2 - c.top) / c.height) * 2 - 1);
  const dist = camera.position.z - planeZ;
  const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
  const visibleW = visibleH * camera.aspect;
  return {
    x: camera.position.x + (nx * visibleW) / 2,
    y: camera.position.y + (ny * visibleH) / 2,
    width: (r.width / c.width) * visibleW,
    height: (r.height / c.height) * visibleH,
    visibleH,
    visible: r.width > 0 && r.height > 0
  };
}

/** Frame-rate independent smoothing toward a target. */
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/**
 * A soft contact shadow: a blurred ellipse lying flat under an object, the cheap stand-in for baked ambient
 * occlusion that product renders use to sit things on a surface. Scale it to the object's footprint.
 */
export function createContactShadow({ opacity = 0.42, color = '24, 32, 28' } = {}) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color}, 1)`);
  g.addColorStop(0.35, `rgba(${color}, 0.55)`);
  g.addColorStop(0.7, `rgba(${color}, 0.14)`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * A glossy floor: a mirror reflection of everything on the REFLECTED layer, strongest where a device meets the
 * floor and fading (and softening) with the height of what it reflects, like a product shot on polished acrylic.
 * The floor itself is invisible; only the reflection shows. Lie it at the devices' feet. The mirror camera follows
 * three.js's Reflector (MIT), with layers in place of hiding objects; its depth gives each reflected point's height.
 */
export function createMirrorFloor(renderer, { strength = 0.24, fade = 0.5, resolution = 0.5, samples = 4 } = {}) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    depthTexture: new THREE.DepthTexture(1, 1)
  });
  const textureMatrix = new THREE.Matrix4();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tMirror: { value: target.texture },
      tDepth: { value: target.depthTexture },
      textureMatrix: { value: textureMatrix },
      uMirrorProjectionInverse: { value: new THREE.Matrix4() },
      uMirrorWorld: { value: new THREE.Matrix4() },
      uFloorY: { value: 0 },
      uStrength: { value: strength },
      uFade: { value: fade }
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vMirror;
      void main() {
        vMirror = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMirror;
      uniform sampler2D tDepth;
      uniform mat4 uMirrorProjectionInverse;
      uniform mat4 uMirrorWorld;
      uniform float uFloorY;
      uniform float uStrength;
      uniform float uFade;
      varying vec4 vMirror;
      void main() {
        // Where the reflected point really is, from the mirror camera's depth, and so how high above the floor
        vec2 uv = vMirror.xy / vMirror.w;
        float depth = texture(tDepth, uv).x;
        vec4 view = uMirrorProjectionInverse * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        vec3 point = (uMirrorWorld * vec4(view.xyz / view.w, 1.0)).xyz;
        float k = depth < 1.0 ? clamp((point.y - uFloorY) / uFade, 0.0, 1.0) : 1.0;
        vec4 c = textureLod(tMirror, uv, k * 3.5);
        vec3 col = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
        gl_FragColor = vec4(col, c.a * uStrength * (1.0 - k) * (1.0 - k));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -2;

  const mirror = new THREE.PerspectiveCamera();
  mirror.layers.set(REFLECTED);
  const plane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const floorPos = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const rotation = new THREE.Matrix4();
  const lookAt = new THREE.Vector3();
  const view = new THREE.Vector3();
  const target3 = new THREE.Vector3();
  const clip = new THREE.Vector4();
  const q = new THREE.Vector4();
  const buffer = new THREE.Vector2();
  const scale = new THREE.Vector3();
  const turn = new THREE.Quaternion();

  mesh.onBeforeRender = (r, scene, camera) => {
    floorPos.setFromMatrixPosition(mesh.matrixWorld);
    camPos.setFromMatrixPosition(camera.matrixWorld);
    rotation.extractRotation(mesh.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotation);
    view.subVectors(floorPos, camPos);
    if (view.dot(normal) > 0) return;
    view.reflect(normal).negate().add(floorPos);
    rotation.extractRotation(camera.matrixWorld);
    lookAt.set(0, 0, -1).applyMatrix4(rotation).add(camPos);
    target3.subVectors(floorPos, lookAt).reflect(normal).negate().add(floorPos);
    mirror.position.copy(view);
    mirror.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
    mirror.lookAt(target3);
    mirror.far = camera.far;
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);

    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse).multiply(mesh.matrixWorld);

    // An oblique near plane on the floor, so nothing below it shows in the reflection
    plane.setFromNormalAndCoplanarPoint(normal, floorPos).applyMatrix4(mirror.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = mirror.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + pm[8]) / pm[0], (Math.sign(clip.y) + pm[9]) / pm[5], -1, (1 + pm[10]) / pm[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    pm[2] = clip.x;
    pm[6] = clip.y;
    pm[10] = clip.z + 1;
    pm[14] = clip.w;

    // The fade is set in the floor's own units; the page may scale the whole scene
    mesh.matrixWorld.decompose(target3, turn, scale);
    material.uniforms.uFade.value = fade * scale.x;
    material.uniforms.uFloorY.value = floorPos.y;
    material.uniforms.uMirrorProjectionInverse.value.copy(mirror.projectionMatrix).invert();
    material.uniforms.uMirrorWorld.value.copy(mirror.matrixWorld);

    r.getDrawingBufferSize(buffer);
    const w = Math.max(1, Math.round(buffer.x * resolution));
    const h = Math.max(1, Math.round(buffer.y * resolution));
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    const current = r.getRenderTarget();
    r.setRenderTarget(target);
    r.state.buffers.depth.setMask(true);
    if (!r.autoClear) r.clear();
    r.render(scene, mirror);
    r.setRenderTarget(current);
    if (camera.viewport !== undefined) r.state.viewport(camera.viewport);
  };

  return {
    mesh,
    /** Adds an object (and everything in it) to the reflection. */
    reflect(object) {
      object.traverse((o) => o.layers.enable(REFLECTED));
    }
  };
}
