/**
 * Banking Transaction Network
 * Renders a 3D Globe with arcs representing transactions.
 * Uses SceneCore for management.
 * 
 * @module pages/banking-scene
 */

import { SceneCore } from '../webgl/scene-core.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';
import { Materials } from '../webgl/materials.js';

// ============================================================================
// CONFIG
// ============================================================================

const GLOBE_RADIUS = 3.5;
const PARTICLES = 200;

// ============================================================================
// MOUNT
// ============================================================================

export function mount(container) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return mountFallback(container);
    }

    const gpuTier = detectGPUTier();
    if (gpuTier === GPU_TIER.LOW) {
        return mountFallback(container);
    }

    console.log('[banking-scene] Mounting transaction globe');

    // Init SceneCore
    const sceneCore = new SceneCore(container.id, {
        alpha: true,
        antialias: true
    });

    if (!sceneCore.renderer) {
        return mountFallback(container);
    }

    const { scene, camera, renderer } = sceneCore;

    // Camera
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    // Controls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.enableZoom = false;
        controls.minPolarAngle = Math.PI / 4;
        controls.maxPolarAngle = Math.PI / 1.5;
    }

    // --- Build Scene ---

    // 1. Globe (Wireframe Sphere)
    const globeGeo = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 2);
    const globeMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6, // Blue
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    sceneCore.add(globe);

    // 2. Core Glow
    const coreGeo = new THREE.IcosahedronGeometry(GLOBE_RADIUS * 0.95, 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a, // Dark center
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    sceneCore.add(core);

    // 3. Transaction Arcs (Group)
    const arcsGroup = new THREE.Group();
    sceneCore.add(arcsGroup);

    // Add initial arcs
    for (let i = 0; i < 15; i++) {
        addRandomArc(arcsGroup, GLOBE_RADIUS);
    }

    // 4. Floating Data Particles
    const partsGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLES * 3);

    for (let i = 0; i < PARTICLES; i++) {
        // Random point on sphere surface
        const phi = Math.acos(-1 + (2 * i) / PARTICLES);
        const theta = Math.sqrt(PARTICLES * Math.PI) * phi;

        const r = GLOBE_RADIUS + 0.2 + Math.random() * 0.5;
        positions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
        positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }

    partsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const partsMat = new THREE.PointsMaterial({
        size: 0.08,
        color: 0x10b981, // Green dots (active nodes)
        transparent: true,
        opacity: 0.6
    });
    const particles = new THREE.Points(partsGeo, partsMat);
    sceneCore.add(particles);


    // Animation Loop
    let timer = 0;

    sceneCore.animate((time, delta) => {
        if (controls) controls.update();

        // Rotate globe slightly independent of cam
        globe.rotation.y += 0.001;
        particles.rotation.y += 0.001;

        timer += delta;

        // Spawn/respawn arcs occasionally
        if (Math.random() < 0.05) {
            // Remove old arc logic would be complex, just adding for visual demo
            if (arcsGroup.children.length > 25) {
                arcsGroup.remove(arcsGroup.children[0]);
            }
            addRandomArc(arcsGroup, GLOBE_RADIUS);
        }

        // Pulse particles
        const scale = 1 + Math.sin(time * 3) * 0.05;
        particles.scale.setScalar(scale);
    });

    return {
        destroy: () => {
            sceneCore.dispose();
            if (controls) controls.dispose();
            // manual cleanup of geometries if needed
        }
    };
}

function addRandomArc(group, radius) {
    // Random Start/End/Height
    const start = randomPointOnSphere(radius);
    const end = randomPointOnSphere(radius);
    const dist = start.distanceTo(end);

    if (dist < 0.5) return; // Too short

    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius + dist * 0.5);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
        color: Math.random() > 0.5 ? 0x10b981 : 0xf59e0b, // Green or Amber
        transparent: true,
        opacity: 0.4 + Math.random() * 0.4
    });

    const line = new THREE.Line(geometry, material);
    group.add(line);
}

function randomPointOnSphere(radius) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    container.innerHTML = `
        <div style="height:100%; display:flex; align-items:center; justify-content:center; 
                    background:radial-gradient(circle at center, #1e293b 0%, #0f172a 100%); color:#94a3b8;">
            <div style="text-align:center">
                <div style="font-size:2rem; margin-bottom:0.5rem">🌍</div>
                <div style="font-size:0.8rem">Global Transaction Network</div>
            </div>
        </div>
    `;
    return { destroy: () => { } };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('banking-viz');
    if (container) {
        const scene = mount(container);
        window.__bankingScene = scene;
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
