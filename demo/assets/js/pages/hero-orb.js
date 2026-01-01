/**
 * Hero Voice Orb
 * Landing page 3D visualization with particle ribbons responding to voice/mic input.
 * 
 * @module pages/hero-orb
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS, createPointMaterial, createGlowMaterial } from '../webgl/materials.js';
import { detectGPUTier, getPerformanceLimits, createFPSMeter, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const ORB_CONFIG = {
    radius: 0.8,
    detail: 2,
    pulseSpeed: 2,
    pulseAmount: 0.1,
    rotationSpeed: 0.2
};

const PARTICLE_CONFIG = {
    count: { high: 500, medium: 300, low: 150 },
    innerRadius: 3,
    outerRadius: 5,
    orbitSpeed: 0.001,
    noiseAmount: 0.001
};

const COLORS = {
    orbGlow: 0x14b8a6,    // Teal accent
    primary: 0x8b5cf6,     // Purple
    accent: 0x14b8a6,      // Teal
    background: 0xf8fafc   // Off-white
};

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the hero orb scene.
 * @param {HTMLElement} container - DOM element to mount into
 * @returns {Object} Scene controller with destroy method
 */
export function mount(container) {
    // Check reduced motion preference
    if (prefersReducedMotion()) {
        return mountFallback(container);
    }

    // Detect GPU capabilities
    const gpuTier = detectGPUTier();
    const limits = getPerformanceLimits(gpuTier);

    // Use fallback for very low tier
    if (gpuTier === GPU_TIER.LOW) {
        console.log('[hero-orb] Low GPU tier detected, using fallback');
        return mountFallback(container);
    }

    console.log(`[hero-orb] Mounting with GPU tier: ${gpuTier}`);

    // Initialize Three.js scene
    const bundle = initScene(container, {
        clearColor: COLORS.background,
        clearAlpha: 0,
        alpha: true
    });

    if (!bundle) {
        console.warn('[hero-orb] Failed to init scene, using fallback');
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Position camera
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Setup lighting
    setupLighting(scene);

    // Create orb
    const orb = createOrb();
    scene.add(orb);

    // Create particles
    const particleCount = gpuTier === GPU_TIER.HIGH
        ? PARTICLE_CONFIG.count.high
        : PARTICLE_CONFIG.count.medium;
    const particles = createParticles(particleCount);
    scene.add(particles.points);

    // Optional: FPS meter (dev only)
    const fpsMeter = createFPSMeter(container, { showInProduction: false });

    // Audio context for mic input (optional)
    let audioContext = null;
    let analyser = null;
    let audioData = null;
    let micActive = false;

    // Animation state
    let time = 0;
    let intensity = 1;

    // Create animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Update audio intensity if mic is active
        if (micActive && analyser && audioData) {
            analyser.getByteFrequencyData(audioData);
            const avg = audioData.reduce((a, b) => a + b, 0) / audioData.length;
            intensity = 1 + (avg / 128) * 2; // Scale to 1-3x
        } else {
            // Gentle idle pulse
            intensity = 1 + Math.sin(time * 0.5) * 0.1;
        }

        // Animate orb
        animateOrb(orb, time, intensity);

        // Animate particles
        animateParticles(particles, time, intensity);

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
            if (audioContext) {
                audioContext.close();
            }
            destroyBundle();
        },
        enableMic: async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                audioData = new Uint8Array(analyser.frequencyBinCount);
                micActive = true;
                console.log('[hero-orb] Microphone enabled');
            } catch (err) {
                console.warn('[hero-orb] Microphone access denied:', err.message);
            }
        },
        disableMic: () => {
            micActive = false;
            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
        }
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

/**
 * Setup three-point lighting.
 */
function setupLighting(scene) {
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(1, 1, 1);
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.PointLight(COLORS.accent, 0.6);
    rimLight.position.set(0, 0, -3);
    scene.add(rimLight);
}

/**
 * Create the central glowing orb.
 */
function createOrb() {
    const geometry = new THREE.IcosahedronGeometry(ORB_CONFIG.radius, ORB_CONFIG.detail);
    const material = new THREE.MeshStandardMaterial({
        color: COLORS.orbGlow,
        emissive: COLORS.orbGlow,
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Add outer glow shell
    const glowGeometry = new THREE.IcosahedronGeometry(ORB_CONFIG.radius * 1.3, ORB_CONFIG.detail);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.orbGlow,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);

    return mesh;
}

/**
 * Animate the orb.
 */
function animateOrb(orb, time, intensity) {
    // Rotation
    orb.rotation.y = time * ORB_CONFIG.rotationSpeed;
    orb.rotation.x = Math.sin(time * 0.3) * 0.1;

    // Pulse scale based on intensity
    const baseScale = 1 + Math.sin(time * ORB_CONFIG.pulseSpeed) * ORB_CONFIG.pulseAmount;
    orb.scale.setScalar(baseScale * Math.sqrt(intensity));

    // Update emissive intensity
    if (orb.material.emissiveIntensity !== undefined) {
        orb.material.emissiveIntensity = 0.2 + (intensity - 1) * 0.3;
    }
}

/**
 * Create the particle system.
 */
function createParticles(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    const primaryColor = new THREE.Color(COLORS.primary);
    const accentColor = new THREE.Color(COLORS.accent);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = PARTICLE_CONFIG.innerRadius +
            Math.random() * (PARTICLE_CONFIG.outerRadius - PARTICLE_CONFIG.innerRadius);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // Random velocities for orbital motion
        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

        // Alternate colors
        const color = i % 2 ? primaryColor : accentColor;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        // Random sizes
        sizes[i] = 0.05 + Math.random() * 0.08;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);

    return {
        points,
        velocities,
        dispose: () => {
            geometry.dispose();
            material.dispose();
        }
    };
}

/**
 * Animate particles.
 */
function animateParticles(particles, time, intensity) {
    const positions = particles.points.geometry.attributes.position.array;
    const count = positions.length / 3;
    const orbitSpeed = PARTICLE_CONFIG.orbitSpeed * intensity;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Orbital rotation
        const x = positions[i3];
        const z = positions[i3 + 2];
        const angle = orbitSpeed + (i % 10) * 0.0001;

        positions[i3] = x * Math.cos(angle) - z * Math.sin(angle);
        positions[i3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);

        // Vertical wave
        positions[i3 + 1] += Math.sin(time * 0.5 + i * 0.1) * PARTICLE_CONFIG.noiseAmount * intensity;

        // Breathing effect - particles move in/out from center
        const dist = Math.sqrt(positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2);
        const targetDist = PARTICLE_CONFIG.innerRadius +
            (PARTICLE_CONFIG.outerRadius - PARTICLE_CONFIG.innerRadius) *
            (0.5 + 0.5 * Math.sin(time * 0.3 + i * 0.05));

        const factor = 1 + (targetDist - dist) * 0.001;
        positions[i3] *= factor;
        positions[i3 + 1] *= factor;
        positions[i3 + 2] *= factor;
    }

    particles.points.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// FALLBACK (SVG/CSS)
// ============================================================================

/**
 * Mount reduced-motion or low-GPU fallback.
 */
function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback hero-orb-fallback';
    fallback.innerHTML = `
        <svg viewBox="-60 -60 120 120" width="200" height="200" style="filter: drop-shadow(0 0 20px rgba(20, 184, 166, 0.4));">
            <defs>
                <radialGradient id="orb-gradient">
                    <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.9"/>
                    <stop offset="70%" stop-color="#8b5cf6" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="glow-gradient">
                    <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <!-- Outer glow -->
            <circle cx="0" cy="0" r="50" fill="url(#glow-gradient)"/>
            <!-- Core orb -->
            <circle cx="0" cy="0" r="25" fill="url(#orb-gradient)"/>
            <!-- Sparkle dots -->
            <circle cx="-35" cy="-20" r="2" fill="#8b5cf6" opacity="0.6"/>
            <circle cx="30" cy="-30" r="1.5" fill="#14b8a6" opacity="0.7"/>
            <circle cx="40" cy="15" r="2" fill="#8b5cf6" opacity="0.5"/>
            <circle cx="-25" cy="35" r="1.5" fill="#14b8a6" opacity="0.6"/>
            <circle cx="5" cy="-40" r="1.5" fill="#8b5cf6" opacity="0.5"/>
        </svg>
    `;

    fallback.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: transparent;
    `;

    container.appendChild(fallback);

    return {
        destroy: () => { fallback.remove(); },
        enableMic: () => { console.log('[hero-orb] Mic not available in fallback mode'); },
        disableMic: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

/**
 * Auto-mount when container is found.
 */
export function autoMount() {
    const container = document.getElementById('hero-voice-orb');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__heroOrbScene = scene;
        });
    }
}

// Auto-run
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
