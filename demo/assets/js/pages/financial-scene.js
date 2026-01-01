/**
 * Financial Forecast Bands
 * 3D layered forecast surfaces with timeline scrubbing.
 * 
 * @module pages/financial-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const BAND_CONFIG = {
    segments: 50,
    width: 12,
    depth: 4,
    layers: 3,
    waveAmplitude: 0.5
};

const BAND_COLORS = [
    { color: 0x8b5cf6, opacity: 0.7 },  // Revenue - Purple
    { color: 0x14b8a6, opacity: 0.5 },  // Forecast - Teal
    { color: 0xf59e0b, opacity: 0.3 }   // Confidence - Amber
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the financial forecast bands scene.
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

    console.log('[financial-scene] Mounting forecast bands');

    const bundle = initScene(container, {
        clearColor: 0xf8fafc,
        clearAlpha: 0,
        alpha: true
    });

    if (!bundle) {
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Camera setup
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    // OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minPolarAngle = 0.3;
        controls.maxPolarAngle = Math.PI / 2 - 0.1;
    }

    // Lighting
    setupLighting(scene);

    // Create forecast bands
    const bands = createBands();
    bands.forEach(band => scene.add(band.mesh));

    // Create grid floor
    const grid = createGrid();
    scene.add(grid);

    // Timeline scrubber state
    let timelinePosition = 0;
    let time = 0;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate bands with wave motion
        bands.forEach((band, i) => {
            updateBandWave(band, time, i);
        });

        if (controls) controls.update();
        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            if (controls) controls.dispose();
            bands.forEach(b => {
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
            grid.geometry.dispose();
            grid.material.dispose();
            destroyBundle();
        },
        setTimeline: (position) => {
            timelinePosition = Math.max(0, Math.min(1, position));
        },
        getTimeline: () => timelinePosition
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(5, 10, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x14b8a6, 0.3);
    rim.position.set(-5, 5, -10);
    scene.add(rim);
}

function createBands() {
    const bands = [];
    const { segments, width, depth, layers } = BAND_CONFIG;

    for (let layer = 0; layer < layers; layer++) {
        const geometry = new THREE.PlaneGeometry(width, depth, segments, 1);

        const { color, opacity } = BAND_COLORS[layer];
        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.6
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.5 + layer * 0.8;

        bands.push({
            mesh,
            geometry,
            layer,
            baseY: mesh.position.y
        });
    }

    return bands;
}

function updateBandWave(band, time, layerIndex) {
    const positions = band.geometry.attributes.position.array;
    const count = positions.length / 3;
    const width = BAND_CONFIG.width;
    const amplitude = BAND_CONFIG.waveAmplitude * (1 - layerIndex * 0.2);
    const phaseOffset = layerIndex * 0.5;

    for (let i = 0; i < count; i++) {
        const x = positions[i * 3];
        const normalizedX = (x + width / 2) / width; // 0 to 1

        // Create wave based on position and time
        const wave = Math.sin(normalizedX * Math.PI * 2 + time * 0.5 + phaseOffset) * amplitude;
        const trend = normalizedX * 1.5; // Upward trend

        positions[i * 3 + 2] = wave + trend + band.baseY;
    }

    band.geometry.attributes.position.needsUpdate = true;
}

function createGrid() {
    const geometry = new THREE.PlaneGeometry(20, 20, 20, 20);
    const material = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });

    const grid = new THREE.Mesh(geometry, material);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0;

    return grid;
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback financial-bands-fallback';

    fallback.innerHTML = `
        <svg viewBox="0 0 200 100" width="100%" height="100%" style="max-height: 300px;">
            <defs>
                <linearGradient id="band1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.9"/>
                </linearGradient>
                <linearGradient id="band2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#14b8a6" stop-opacity="0.7"/>
                </linearGradient>
                <linearGradient id="band3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.5"/>
                </linearGradient>
            </defs>
            <!-- Forecast bands as layered paths -->
            <path d="M10,70 Q50,60 100,55 T190,35" stroke="url(#band3)" stroke-width="20" fill="none" opacity="0.3"/>
            <path d="M10,65 Q50,55 100,45 T190,25" stroke="url(#band2)" stroke-width="15" fill="none" opacity="0.5"/>
            <path d="M10,60 Q50,50 100,40 T190,20" stroke="url(#band1)" stroke-width="10" fill="none" opacity="0.7"/>
            <!-- Labels -->
            <text x="10" y="90" fill="#64748b" font-size="8">Q1</text>
            <text x="60" y="90" fill="#64748b" font-size="8">Q2</text>
            <text x="110" y="90" fill="#64748b" font-size="8">Q3</text>
            <text x="160" y="90" fill="#64748b" font-size="8">Q4</text>
        </svg>
    `;

    fallback.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    `;

    container.appendChild(fallback);

    return {
        destroy: () => fallback.remove(),
        setTimeline: () => { },
        getTimeline: () => 0
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('financial-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__financialScene = scene;
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
