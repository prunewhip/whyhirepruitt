/**
 * Emotions Particle Aura
 * Emotion-driven particle visualization with timeline scrubbing.
 * 
 * @module pages/emotions-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS, EMOTION_HUE_MAP } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER, getPerformanceLimits } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const PARTICLE_CONFIG = {
    count: { high: 800, medium: 400, low: 200 },
    innerRadius: 0.5,
    outerRadius: 4,
    speed: 0.5
};

const EMOTION_COLORS = {
    joy: 0xfbbf24,        // Amber
    sadness: 0x3b82f6,    // Blue
    anger: 0xef4444,      // Red
    fear: 0x8b5cf6,       // Purple
    surprise: 0x14b8a6,   // Teal
    neutral: 0x64748b     // Gray
};

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the emotions particle aura scene.
 * @param {HTMLElement} container
 * @returns {Object} Scene controller
 */
export function mount(container) {
    if (prefersReducedMotion()) {
        return mountFallback(container);
    }

    const gpuTier = detectGPUTier();
    if (gpuTier === GPU_TIER.LOW) {
        return mountFallback(container);
    }

    console.log('[emotions-scene] Mounting particle aura');

    const bundle = initScene(container, {
        clearColor: 0x0f172a,
        clearAlpha: 1,
        alpha: false
    });

    if (!bundle) {
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Camera setup
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    // Lighting
    setupLighting(scene);

    // Create central emotion core
    const core = createEmotionCore();
    scene.add(core.mesh);

    // Create particle systems for each emotion
    const limits = getPerformanceLimits(gpuTier);
    const particleCount = gpuTier === GPU_TIER.HIGH
        ? PARTICLE_CONFIG.count.high
        : PARTICLE_CONFIG.count.medium;

    const particles = createParticleAura(particleCount);
    scene.add(particles.points);

    // State
    let currentEmotion = 'neutral';
    let time = 0;
    let targetHue = 0.5;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate core
        updateCore(core, time, currentEmotion);

        // Animate particles
        updateParticles(particles, time, targetHue);

        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            core.dispose();
            particles.dispose();
            destroyBundle();
        },
        setEmotion: (emotion) => {
            currentEmotion = emotion;
            if (EMOTION_HUE_MAP && EMOTION_HUE_MAP[emotion] !== undefined) {
                targetHue = EMOTION_HUE_MAP[emotion];
            } else {
                // Fallback hue mapping
                const hueMap = { joy: 0.12, sadness: 0.6, anger: 0.0, fear: 0.75, surprise: 0.5, neutral: 0.5 };
                targetHue = hueMap[emotion] || 0.5;
            }
        },
        getEmotion: () => currentEmotion
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0x1e293b, 0.3);
    scene.add(ambient);

    const center = new THREE.PointLight(0xffffff, 1, 10);
    center.position.set(0, 0, 0);
    scene.add(center);
}

function createEmotionCore() {
    const geometry = new THREE.IcosahedronGeometry(0.8, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x64748b,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Outer glow
    const glowGeometry = new THREE.IcosahedronGeometry(1.2, 2);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    return {
        mesh,
        glow,
        material,
        glowMaterial,
        dispose: () => {
            geometry.dispose();
            material.dispose();
            glowGeometry.dispose();
            glowMaterial.dispose();
        }
    };
}

function updateCore(core, time, emotion) {
    // Rotation
    core.mesh.rotation.y = time * 0.2;
    core.mesh.rotation.x = Math.sin(time * 0.3) * 0.1;

    // Pulse
    const pulse = 1 + Math.sin(time * 2) * 0.1;
    core.mesh.scale.setScalar(pulse);

    // Update color based on emotion
    const emotionColor = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
    core.material.color.lerp(new THREE.Color(emotionColor), 0.05);
    core.material.emissive.lerp(new THREE.Color(emotionColor), 0.05);
    core.glowMaterial.color.lerp(new THREE.Color(emotionColor), 0.05);
}

function createParticleAura(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

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

        velocities[i3] = (Math.random() - 0.5) * 0.01;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

        // Initial neutral color
        colors[i3] = 0.4;
        colors[i3 + 1] = 0.45;
        colors[i3 + 2] = 0.55;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
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

function updateParticles(particles, time, targetHue) {
    const positions = particles.points.geometry.attributes.position.array;
    const colors = particles.points.geometry.attributes.color.array;
    const count = positions.length / 3;
    const { outerRadius, innerRadius, speed } = PARTICLE_CONFIG;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Orbital motion
        const x = positions[i3];
        const z = positions[i3 + 2];
        const angle = speed * 0.002 + (i % 20) * 0.0001;

        positions[i3] = x * Math.cos(angle) - z * Math.sin(angle);
        positions[i3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);

        // Breathing
        positions[i3 + 1] += Math.sin(time * 0.5 + i * 0.05) * 0.002;

        // Gradually shift colors toward target hue
        const targetColor = new THREE.Color().setHSL(targetHue, 0.7, 0.5 + Math.random() * 0.2);
        colors[i3] += (targetColor.r - colors[i3]) * 0.01;
        colors[i3 + 1] += (targetColor.g - colors[i3 + 1]) * 0.01;
        colors[i3 + 2] += (targetColor.b - colors[i3 + 2]) * 0.01;
    }

    particles.points.geometry.attributes.position.needsUpdate = true;
    particles.points.geometry.attributes.color.needsUpdate = true;
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback emotions-aura-fallback';

    fallback.innerHTML = `
        <svg viewBox="-60 -60 120 120" width="200" height="200">
            <defs>
                <radialGradient id="emotion-glow">
                    <stop offset="0%" stop-color="#64748b" stop-opacity="0.8"/>
                    <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="50" fill="url(#emotion-glow)"/>
            <circle cx="0" cy="0" r="15" fill="#64748b" opacity="0.9"/>
        </svg>
        <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Emotion Analysis</p>
    `;

    fallback.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0f172a, #1e293b);
    `;

    container.appendChild(fallback);

    return {
        destroy: () => fallback.remove(),
        setEmotion: () => { },
        getEmotion: () => 'neutral'
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('emotions-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__emotionsScene = scene;
        });
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
