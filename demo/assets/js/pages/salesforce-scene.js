/**
 * Salesforce 3D Funnel
 * Pipeline funnel with orbiting deal nodes, scroll-bound stages.
 * 
 * @module pages/salesforce-scene
 */

import { SceneCore } from '../webgl/scene-core.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const FUNNEL_CONFIG = {
    topRadius: 4,
    bottomRadius: 1.5,
    height: 8,
    segments: 5
};

const STAGE_COLORS = [
    0x94a3b8,  // Lead - Gray
    0x3b82f6,  // Qualified - Blue
    0xf59e0b,  // Proposal - Amber
    0x8b5cf6,  // Negotiation - Purple
    0x10b981   // Closed - Green
];

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];

// Sample deal data
const DEALS = [
    { id: 1, stage: 0, value: 50000, name: 'Acme Corp' },
    { id: 2, stage: 0, value: 30000, name: 'Widget Inc' },
    { id: 3, stage: 1, value: 75000, name: 'Tech Solutions' },
    { id: 4, stage: 1, value: 45000, name: 'Data Systems' },
    { id: 5, stage: 2, value: 120000, name: 'Enterprise Co' },
    { id: 6, stage: 2, value: 85000, name: 'Global Trade' },
    { id: 7, stage: 3, value: 200000, name: 'Mega Deal' },
    { id: 8, stage: 4, value: 150000, name: 'Won Deal' }
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

export function mount(container) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return mountFallback(container);
    }

    const gpuTier = detectGPUTier();
    if (gpuTier === GPU_TIER.LOW) {
        return mountFallback(container);
    }

    console.log('[salesforce-scene] Mounting pipeline funnel');

    // Init SceneCore
    const sceneCore = new SceneCore(container.id, {
        alpha: true,
        antialias: true
    });

    if (!sceneCore.renderer) {
        return mountFallback(container);
    }

    const { scene, camera, renderer } = sceneCore;

    // Camera setup - looking down at funnel
    camera.position.set(8, 10, 8);
    camera.lookAt(0, 0, 0);

    // OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 8;
        controls.maxDistance = 25;
        // Keep auto-rotate from being too distracting, but maybe slow spin?
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
    }

    // Lighting
    setupLighting(scene);

    // Create funnel
    const funnel = createFunnel();
    sceneCore.add(funnel.group);

    // Create deal nodes
    const deals = createDeals();
    deals.forEach(deal => sceneCore.add(deal.mesh));

    // Animation loop using SceneCore
    sceneCore.animate((time, delta) => {
        // Animate funnel rings
        updateFunnel(funnel, time);

        // Animate deals orbiting their stages
        updateDeals(deals, time);

        if (controls) controls.update();
    });

    return {
        destroy: () => {
            sceneCore.dispose();
            if (controls) controls.dispose();
            funnel.dispose();
            deals.forEach(d => {
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
            });
        },
        focusStage: (stageIndex) => {
            if (controls && stageIndex >= 0 && stageIndex < STAGES.length) {
                const y = FUNNEL_CONFIG.height / 2 - (stageIndex / (STAGES.length - 1)) * FUNNEL_CONFIG.height;
                controls.target.set(0, y, 0);
            }
        }
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(10, 15, 10);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b5cf6, 0.2);
    rim.position.set(-5, 5, -5);
    scene.add(rim);
}

function createFunnel() {
    const group = new THREE.Group();
    const rings = [];
    const { topRadius, bottomRadius, height, segments } = FUNNEL_CONFIG;

    for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        const radius = topRadius - t * (topRadius - bottomRadius);
        const y = height / 2 - t * height;

        const geometry = new THREE.TorusGeometry(radius, 0.08, 16, 64);
        const material = new THREE.MeshStandardMaterial({
            color: STAGE_COLORS[i],
            transparent: true,
            opacity: 0.6,
            metalness: 0.2,
            roughness: 0.5
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;

        group.add(ring);
        rings.push({ mesh: ring, baseY: y, index: i });
    }

    return {
        group,
        rings,
        dispose: () => {
            rings.forEach(r => {
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
            });
        }
    };
}

function createDeals() {
    const deals = [];
    const { topRadius, bottomRadius, height, segments } = FUNNEL_CONFIG;

    DEALS.forEach((dealData, index) => {
        const t = dealData.stage / (segments - 1);
        const radius = topRadius - t * (topRadius - bottomRadius);
        const y = height / 2 - t * height;

        // Size based on deal value
        const size = 0.15 + (dealData.value / 200000) * 0.25;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: STAGE_COLORS[dealData.stage],
            emissive: STAGE_COLORS[dealData.stage],
            emissiveIntensity: 0.3,
            metalness: 0.3,
            roughness: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Initial position on orbit
        const angle = (index / DEALS.length) * Math.PI * 2;
        mesh.position.set(
            Math.cos(angle) * (radius + 0.5),
            y,
            Math.sin(angle) * (radius + 0.5)
        );

        deals.push({
            ...dealData,
            mesh,
            orbitRadius: radius + 0.5,
            baseY: y,
            orbitSpeed: 0.3 + Math.random() * 0.2,
            phase: angle
        });
    });

    return deals;
}

function updateFunnel(funnel, time) {
    funnel.rings.forEach((ring, i) => {
        // Subtle pulse
        const pulse = 1 + Math.sin(time * 1.5 + i * 0.5) * 0.02;
        ring.mesh.scale.set(pulse, pulse, 1);
    });
}

function updateDeals(deals, time) {
    deals.forEach(deal => {
        // Orbit around funnel
        const angle = deal.phase + time * deal.orbitSpeed;
        deal.mesh.position.x = Math.cos(angle) * deal.orbitRadius;
        deal.mesh.position.z = Math.sin(angle) * deal.orbitRadius;

        // Subtle vertical bobbing
        deal.mesh.position.y = deal.baseY + Math.sin(time * 2 + deal.phase) * 0.1;
    });
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback salesforce-funnel-fallback';

    const stageHTML = STAGES.map((stage, i) => {
        const width = 100 - i * 15;
        const color = ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'][i];
        const dealCount = DEALS.filter(d => d.stage === i).length;
        return `
            <div style="width: ${width}%; height: 25px; background: ${color}; opacity: 0.6; 
                        border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 10px; color: white; font-weight: 500;">${stage} (${dealCount})</span>
            </div>
        `;
    }).join('');

    fallback.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; max-width: 300px;">
            ${stageHTML}
        </div>
    `;

    fallback.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        padding: 20px;
    `;

    container.appendChild(fallback);

    return {
        destroy: () => fallback.remove(),
        focusStage: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('salesforce-viz');
    if (container) {
        const scene = mount(container);
        window.__salesforceScene = scene;
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
