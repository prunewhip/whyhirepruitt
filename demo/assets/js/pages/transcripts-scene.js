/**
 * Transcripts Waveform Tunnel
 * 3D waveform visualization for audio transcripts with text extrusion.
 * 
 * @module pages/transcripts-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const WAVEFORM_CONFIG = {
    segments: 64,
    radius: 3,
    length: 15,
    amplitude: 0.5,
    speed: 1.5
};

const COLORS = {
    primary: 0x8b5cf6,    // Purple
    secondary: 0x14b8a6,  // Teal
    accent: 0xf59e0b      // Amber
};

// Simulated audio amplitude data
const generateWaveformData = () => {
    const data = [];
    for (let i = 0; i < 128; i++) {
        data.push(Math.random() * 0.8 + 0.2);
    }
    return data;
};

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the transcripts waveform scene.
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

    console.log('[transcripts-scene] Mounting waveform tunnel');

    const bundle = initScene(container, {
        clearColor: 0x0f172a,  // Dark slate for tunnel effect
        clearAlpha: 1,
        alpha: false
    });

    if (!bundle) {
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Camera inside the tunnel
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, -10);

    // Lighting
    setupLighting(scene);

    // Create waveform tunnel
    const waveformData = generateWaveformData();
    const tunnel = createTunnel(waveformData);
    scene.add(tunnel.group);

    // Create floating text particles
    const textParticles = createTextParticles();
    scene.add(textParticles.points);

    // Animation state
    let time = 0;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate tunnel rings
        updateTunnel(tunnel, time, waveformData);

        // Animate text particles
        updateTextParticles(textParticles, time);

        // Subtle camera movement
        camera.position.y = Math.sin(time * 0.3) * 0.2;
        camera.position.x = Math.cos(time * 0.2) * 0.1;

        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            tunnel.dispose();
            textParticles.dispose();
            destroyBundle();
        },
        setWaveformData: (data) => {
            // Could update waveform in real-time
            console.log('[transcripts-scene] Waveform data updated');
        }
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0x1e293b, 0.5);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(COLORS.primary, 1, 20);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(COLORS.secondary, 0.5, 30);
    backLight.position.set(0, 0, -15);
    scene.add(backLight);
}

function createTunnel(waveformData) {
    const group = new THREE.Group();
    const rings = [];
    const { segments, radius, length } = WAVEFORM_CONFIG;
    const ringCount = 30;

    for (let i = 0; i < ringCount; i++) {
        const geometry = new THREE.TorusGeometry(radius, 0.05, 8, segments);

        const hue = (i / ringCount) * 0.3; // Purple to teal gradient
        const color = new THREE.Color().setHSL(0.75 - hue, 0.7, 0.5);

        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.z = -i * (length / ringCount);
        ring.userData = { baseZ: ring.position.z, index: i };

        group.add(ring);
        rings.push(ring);
    }

    return {
        group,
        rings,
        dispose: () => {
            rings.forEach(r => {
                r.geometry.dispose();
                r.material.dispose();
            });
        }
    };
}

function updateTunnel(tunnel, time, waveformData) {
    const { amplitude, speed, length } = WAVEFORM_CONFIG;
    const ringCount = tunnel.rings.length;

    tunnel.rings.forEach((ring, i) => {
        // Move rings towards camera
        ring.position.z += speed * 0.02;

        // Reset to back when passed camera
        if (ring.position.z > 10) {
            ring.position.z = -length;
        }

        // Pulsing radius based on waveform data
        const dataIndex = Math.floor((i / ringCount) * waveformData.length);
        const waveValue = waveformData[dataIndex] || 0.5;
        const pulseScale = 1 + Math.sin(time * 3 + i * 0.3) * amplitude * waveValue;
        ring.scale.set(pulseScale, pulseScale, 1);

        // Rotation
        ring.rotation.z = time * 0.1 + i * 0.05;
    });
}

function createTextParticles() {
    const count = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const primaryColor = new THREE.Color(COLORS.primary);
    const secondaryColor = new THREE.Color(COLORS.secondary);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Distribute along tunnel
        positions[i3] = (Math.random() - 0.5) * 6;
        positions[i3 + 1] = (Math.random() - 0.5) * 6;
        positions[i3 + 2] = Math.random() * -20;

        // Color gradient
        const t = Math.random();
        const color = primaryColor.clone().lerp(secondaryColor, t);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = 0.05 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);

    return {
        points,
        dispose: () => {
            geometry.dispose();
            material.dispose();
        }
    };
}

function updateTextParticles(particles, time) {
    const positions = particles.points.geometry.attributes.position.array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Move towards camera
        positions[i3 + 2] += 0.05;

        // Reset when passed camera
        if (positions[i3 + 2] > 10) {
            positions[i3 + 2] = -20;
            positions[i3] = (Math.random() - 0.5) * 6;
            positions[i3 + 1] = (Math.random() - 0.5) * 6;
        }

        // Subtle wave motion
        positions[i3] += Math.sin(time + i) * 0.002;
        positions[i3 + 1] += Math.cos(time + i) * 0.002;
    }

    particles.points.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback transcripts-waveform-fallback';

    // Create simple 2D waveform
    const bars = [];
    for (let i = 0; i < 40; i++) {
        const height = 20 + Math.random() * 60;
        bars.push(`<div style="width: 4px; height: ${height}px; background: linear-gradient(to top, #8b5cf6, #14b8a6); border-radius: 2px; opacity: 0.7;"></div>`);
    }

    fallback.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 3px; height: 100px;">
            ${bars.join('')}
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 10px;">Audio Waveform</p>
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
        setWaveformData: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('transcripts-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__transcriptsScene = scene;
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
