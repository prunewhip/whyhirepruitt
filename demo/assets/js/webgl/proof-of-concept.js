/**
 * WebGL Proof of Concept
 * Demonstrates core capabilities: scene setup, particles, glow, and reduced-motion.
 * Tests Three.js integration in the current shell.
 * 
 * @module webgl/proof-of-concept
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from './scene-core.js';
import { VIZ_COLORS, createPointMaterial, createGlowMaterial } from './materials.js';
import { detectGPUTier, getPerformanceLimits, createFPSMeter } from './perf.js';

// ============================================================================
// PROOF OF CONCEPT SCENE
// ============================================================================

/**
 * Mount a proof-of-concept 3D scene demonstrating core capabilities.
 * @param {HTMLElement} container - Element to mount into
 * @returns {Object} Scene controller with destroy method
 */
export function mountProofOfConcept(container) {
    // Check for reduced motion preference
    if (prefersReducedMotion()) {
        return mountFallback(container);
    }

    // Detect GPU tier and get limits
    const gpuTier = detectGPUTier();
    const limits = getPerformanceLimits(gpuTier);
    console.log(`[POC] GPU Tier: ${gpuTier}, Limits:`, limits);

    // Initialize scene
    const bundle = initScene(container, {
        clearColor: VIZ_COLORS.cream,
        clearAlpha: 1
    });

    if (!bundle) {
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Create FPS meter
    const fpsMeter = createFPSMeter(container, { showInProduction: false });

    // Setup lighting
    setupLighting(scene);

    // Create particle system
    const particles = createParticleSystem(limits.maxParticles);
    scene.add(particles.points);

    // Create central glow sphere
    const glowSphere = createGlowSphere();
    scene.add(glowSphere);

    // Animation state
    let time = 0;

    // Create animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate particles
        animateParticles(particles, time);

        // Animate glow sphere
        glowSphere.rotation.y = time * 0.2;
        glowSphere.scale.setScalar(1 + Math.sin(time * 2) * 0.1);

        // Render
        renderer.render(scene, camera);
        fpsMeter.update();
    }, isVisible);

    loop.start();

    // Return controller
    return {
        destroy: () => {
            loop.stop();
            fpsMeter.destroy();
            particles.dispose();
            destroyBundle();
        }
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

/**
 * Setup three-point lighting.
 * @param {THREE.Scene} scene
 */
function setupLighting(scene) {
    // Key light (directional)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(1, 1, 1);
    scene.add(keyLight);

    // Fill light (ambient)
    const fillLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(fillLight);

    // Rim light (point)
    const rimLight = new THREE.PointLight(0xffffff, 0.6);
    rimLight.position.set(0, 0, -2);
    scene.add(rimLight);
}

/**
 * Create a particle system.
 * @param {number} count - Number of particles
 * @returns {Object} Particle system with animate method
 */
function createParticleSystem(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Initialize particles in a sphere
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 3 + Math.random() * 2;

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

        // Alternate between primary and accent colors
        const color = new THREE.Color(i % 2 ? VIZ_COLORS.primary : VIZ_COLORS.accent);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);

    return {
        points,
        positions,
        velocities,
        dispose: () => {
            geometry.dispose();
            material.dispose();
        }
    };
}

/**
 * Animate particle positions.
 * @param {Object} particles
 * @param {number} time
 */
function animateParticles(particles, time) {
    const positions = particles.points.geometry.attributes.position.array;
    const velocities = particles.velocities;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Add subtle orbital motion
        const x = positions[i3];
        const z = positions[i3 + 2];
        const angle = 0.001 + (i % 10) * 0.0001;

        positions[i3] = x * Math.cos(angle) - z * Math.sin(angle);
        positions[i3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);

        // Add noise-based displacement
        positions[i3 + 1] += Math.sin(time * 0.5 + i * 0.1) * 0.001;
    }

    particles.points.geometry.attributes.position.needsUpdate = true;
}

/**
 * Create a glowing central sphere.
 * @returns {THREE.Mesh}
 */
function createGlowSphere() {
    const geometry = new THREE.IcosahedronGeometry(0.8, 2);
    const material = createGlowMaterial({ color: VIZ_COLORS.accent, opacity: 0.5 });
    return new THREE.Mesh(geometry, material);
}

// ============================================================================
// REDUCED MOTION FALLBACK
// ============================================================================

/**
 * Mount a simple SVG fallback for reduced motion.
 * @param {HTMLElement} container
 * @returns {Object} Fallback controller
 */
function mountFallback(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '-50 -50 100 100');
    svg.style.cssText = 'width: 100%; height: 100%;';

    svg.innerHTML = `
        <defs>
            <radialGradient id="glow-gradient">
                <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
            </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="40" fill="url(#glow-gradient)"/>
        <circle cx="0" cy="0" r="15" fill="#8b5cf6" opacity="0.8"/>
        <text x="0" y="4" text-anchor="middle" fill="#faf8f5" font-size="6" font-family="system-ui">
            WebGL Ready
        </text>
    `;

    container.appendChild(svg);

    return {
        destroy: () => { svg.remove(); }
    };
}

// ============================================================================
// DEMO PAGE INTEGRATION
// ============================================================================

/**
 * Auto-mount proof of concept when container is present.
 */
export function autoMount() {
    const container = document.getElementById('webgl-poc');
    if (container) {
        lazyMount(container, () => {
            window.__pocScene = mountProofOfConcept(container);
        });
    }
}

// Auto-run if this is the entry point
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
