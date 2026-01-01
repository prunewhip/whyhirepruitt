/**
 * Memories 3D Card Stacks
 * Floating memory cards with search-driven camera movement.
 * 
 * @module pages/memories-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const CARD_CONFIG = {
    width: 1.5,
    height: 2,
    depth: 0.05,
    spacing: 2.5,
    floatAmplitude: 0.1,
    rotationRange: 0.1
};

const COLORS = {
    card: 0xffffff,
    accent: 0x8b5cf6,
    highlight: 0x14b8a6
};

// Sample memory categories
const MEMORY_CLUSTERS = [
    { id: 'work', position: { x: -4, y: 0, z: 0 }, count: 5 },
    { id: 'personal', position: { x: 4, y: 0, z: 0 }, count: 4 },
    { id: 'ideas', position: { x: 0, y: 3, z: -2 }, count: 3 },
    { id: 'projects', position: { x: 0, y: -3, z: -2 }, count: 4 }
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the memories card stack scene.
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

    console.log('[memories-scene] Mounting card stacks');

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
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    // OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 6;
        controls.maxDistance = 20;
    }

    // Lighting
    setupLighting(scene);

    // Create card clusters
    const cards = createCardClusters();
    cards.forEach(card => scene.add(card.mesh));

    // Create connecting lines between clusters
    const connections = createConnections(cards);
    connections.forEach(conn => scene.add(conn));

    // Animation state
    let time = 0;
    let focusedCluster = null;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate cards
        updateCards(cards, time);

        if (controls) controls.update();
        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            if (controls) controls.dispose();
            cards.forEach(c => {
                c.mesh.geometry.dispose();
                c.mesh.material.dispose();
            });
            connections.forEach(c => {
                c.geometry.dispose();
                c.material.dispose();
            });
            destroyBundle();
        },
        focusCluster: (clusterId) => {
            const cluster = MEMORY_CLUSTERS.find(c => c.id === clusterId);
            if (cluster && controls) {
                const target = new THREE.Vector3(cluster.position.x, cluster.position.y, cluster.position.z);
                controls.target.lerp(target, 0.1);
            }
            focusedCluster = clusterId;
        },
        getFocusedCluster: () => focusedCluster
    };
}

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

function setupLighting(scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(5, 10, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8b5cf6, 0.2);
    fill.position.set(-5, -5, 5);
    scene.add(fill);
}

function createCardClusters() {
    const cards = [];
    const { width, height, depth, spacing } = CARD_CONFIG;

    MEMORY_CLUSTERS.forEach(cluster => {
        for (let i = 0; i < cluster.count; i++) {
            const geometry = new THREE.BoxGeometry(width, height, depth);

            const material = new THREE.MeshStandardMaterial({
                color: COLORS.card,
                metalness: 0.1,
                roughness: 0.5
            });

            const mesh = new THREE.Mesh(geometry, material);

            // Position within cluster with some randomness
            const offsetX = (Math.random() - 0.5) * spacing;
            const offsetY = (Math.random() - 0.5) * spacing * 0.8;
            const offsetZ = i * 0.2 - cluster.count * 0.1;

            mesh.position.set(
                cluster.position.x + offsetX,
                cluster.position.y + offsetY,
                cluster.position.z + offsetZ
            );

            // Random initial rotation
            mesh.rotation.y = (Math.random() - 0.5) * 0.3;
            mesh.rotation.x = (Math.random() - 0.5) * 0.1;

            // Add accent edge
            const edgeGeometry = new THREE.BoxGeometry(width + 0.02, height + 0.02, depth - 0.02);
            const edgeMaterial = new THREE.MeshBasicMaterial({
                color: i === 0 ? COLORS.accent : 0xe2e8f0,
                transparent: true,
                opacity: 0.5
            });
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.z = -0.01;
            mesh.add(edge);

            cards.push({
                mesh,
                cluster: cluster.id,
                basePosition: mesh.position.clone(),
                baseRotation: mesh.rotation.clone(),
                index: i
            });
        }
    });

    return cards;
}

function createConnections(cards) {
    const connections = [];
    const material = new THREE.LineBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.2
    });

    // Create lines between cluster centers
    const clusterCenters = MEMORY_CLUSTERS.map(c =>
        new THREE.Vector3(c.position.x, c.position.y, c.position.z)
    );

    for (let i = 0; i < clusterCenters.length; i++) {
        for (let j = i + 1; j < clusterCenters.length; j++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                clusterCenters[i],
                clusterCenters[j]
            ]);
            const line = new THREE.Line(geometry, material.clone());
            connections.push(line);
        }
    }

    return connections;
}

function updateCards(cards, time) {
    const { floatAmplitude, rotationRange } = CARD_CONFIG;

    cards.forEach((card, i) => {
        // Floating motion
        card.mesh.position.y = card.basePosition.y +
            Math.sin(time + i * 0.5) * floatAmplitude;

        // Subtle rotation
        card.mesh.rotation.y = card.baseRotation.y +
            Math.sin(time * 0.5 + i * 0.3) * rotationRange;
        card.mesh.rotation.x = card.baseRotation.x +
            Math.cos(time * 0.3 + i * 0.2) * rotationRange * 0.5;
    });
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback memories-cards-fallback';

    // Create simple card grid
    const cardHTML = MEMORY_CLUSTERS.map(cluster => `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="display: flex; gap: 2px;">
                ${Array(cluster.count).fill(0).map((_, i) => `
                    <div style="width: 20px; height: 28px; background: white; border-radius: 3px; 
                         box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 2px solid ${i === 0 ? '#8b5cf6' : '#e2e8f0'};
                         transform: rotate(${(Math.random() - 0.5) * 10}deg);"></div>
                `).join('')}
            </div>
            <span style="font-size: 10px; color: #64748b;">${cluster.id}</span>
        </div>
    `).join('');

    fallback.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 30px; flex-wrap: wrap;">
            ${cardHTML}
        </div>
    `;

    fallback.style.cssText = `
        display: flex;
        flex-direction: column;
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
        focusCluster: () => { },
        getFocusedCluster: () => null
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('memories-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__memoriesScene = scene;
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
