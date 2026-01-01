/**
 * Analytics Volumetric Bars
 * 3D bar charts with scroll-driven camera rails and parallax effects.
 * 
 * @module pages/analytics-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const BAR_CONFIG = {
    width: 0.8,
    depth: 0.5,
    maxHeight: 6,
    gap: 1.2,
    bevelRadius: 0.05
};

const COLORS = {
    revenue: 0x8b5cf6,    // Purple
    growth: 0x14b8a6,     // Teal
    margin: 0xf59e0b,     // Amber
    users: 0x3b82f6       // Blue
};

// Sample KPI data (would come from mock_data.js in production)
const KPI_DATA = [
    { label: 'Q1 Revenue', value: 0.85, category: 'revenue' },
    { label: 'Q2 Revenue', value: 0.92, category: 'revenue' },
    { label: 'Q3 Revenue', value: 0.78, category: 'revenue' },
    { label: 'Q4 Revenue', value: 1.0, category: 'revenue' },
    { label: 'Growth Rate', value: 0.65, category: 'growth' },
    { label: 'Profit Margin', value: 0.72, category: 'margin' },
    { label: 'Active Users', value: 0.88, category: 'users' }
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the analytics volumetric bars scene.
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

    console.log('[analytics-scene] Mounting volumetric bars');

    const bundle = initScene(container, {
        clearColor: 0xf8fafc,
        clearAlpha: 0,
        alpha: true
    });

    if (!bundle) {
        return mountFallback(container);
    }

    const { renderer, scene, camera, isVisible, destroy: destroyBundle } = bundle;

    // Camera setup - isometric-ish view
    camera.position.set(8, 6, 12);
    camera.lookAt(0, 2, 0);

    // OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 2, 0);
    }

    // Lighting
    setupLighting(scene);

    // Create bars
    const bars = createBars(KPI_DATA);
    bars.forEach(bar => scene.add(bar.mesh));

    // Floor plane
    const floor = createFloor();
    scene.add(floor);

    // Animation state
    let time = 0;
    let targetCameraY = camera.position.y;

    // Scroll handler for parallax
    const handleScroll = () => {
        const rect = container.getBoundingClientRect();
        const scrollProgress = 1 - (rect.top + rect.height) / (window.innerHeight + rect.height);
        targetCameraY = 6 + scrollProgress * 4;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Smooth camera follow
        camera.position.y += (targetCameraY - camera.position.y) * 0.05;

        // Animate bars
        bars.forEach((bar, i) => {
            // Subtle floating
            bar.mesh.position.y = bar.baseY + Math.sin(time + i * 0.5) * 0.05;

            // Gentle rotation on hover effect
            bar.mesh.rotation.y = Math.sin(time * 0.3 + i * 0.2) * 0.02;
        });

        if (controls) controls.update();
        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            window.removeEventListener('scroll', handleScroll);
            if (controls) controls.dispose();
            bars.forEach(b => {
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
            });
            floor.geometry.dispose();
            floor.material.dispose();
            destroyBundle();
        },
        updateData: (newData) => {
            // Could animate to new values
            console.log('[analytics-scene] Data update received');
        }
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(10, 15, 10);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 5, -5);
    scene.add(fill);
}

function createBars(data) {
    const bars = [];
    const totalWidth = data.length * BAR_CONFIG.gap;
    const startX = -totalWidth / 2 + BAR_CONFIG.gap / 2;

    data.forEach((item, i) => {
        const height = item.value * BAR_CONFIG.maxHeight;
        const geometry = new THREE.BoxGeometry(
            BAR_CONFIG.width,
            height,
            BAR_CONFIG.depth
        );

        const color = COLORS[item.category] || 0x64748b;

        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.1,
            roughness: 0.5,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Position bars in a row
        const x = startX + i * BAR_CONFIG.gap;
        const baseY = height / 2 + 0.01; // Slightly above floor

        mesh.position.set(x, baseY, 0);

        bars.push({
            mesh,
            data: item,
            baseY,
            index: i
        });
    });

    return bars;
}

function createFloor() {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0,
        roughness: 0.8
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;

    return floor;
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback analytics-bars-fallback';

    // Create simple 2D bar chart fallback
    const bars = KPI_DATA.map((d, i) => {
        const height = d.value * 100;
        const colors = { revenue: '#8b5cf6', growth: '#14b8a6', margin: '#f59e0b', users: '#3b82f6' };
        const color = colors[d.category] || '#64748b';
        return `<div style="height: ${height}px; width: 30px; background: ${color}; border-radius: 4px 4px 0 0; opacity: 0.8;"></div>`;
    }).join('');

    fallback.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 150px; padding: 20px;">
            ${bars}
        </div>
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 10px;">KPI Metrics</p>
    `;

    fallback.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    `;

    container.appendChild(fallback);

    return {
        destroy: () => fallback.remove(),
        updateData: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('analytics-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__analyticsScene = scene;
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
