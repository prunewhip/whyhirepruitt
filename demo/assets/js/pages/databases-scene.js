/**
 * Databases Cubic Grid
 * 3D node-link schema visualization with query hover highlighting.
 * 
 * @module pages/databases-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const GRID_CONFIG = {
    nodeSize: 0.3,
    spacing: 2,
    depth: 3,
    rows: 4,
    cols: 4,
    connectionOpacity: 0.3
};

const COLORS = {
    table: 0x8b5cf6,      // Purple - main tables
    foreign: 0x14b8a6,    // Teal - foreign keys
    index: 0xf59e0b,      // Amber - indexes
    connection: 0x94a3b8, // Gray - connections
    highlight: 0x3b82f6   // Blue - highlighted
};

// Schema mock data
const TABLES = [
    { id: 'users', type: 'table', position: { x: -3, y: 1, z: 0 } },
    { id: 'orders', type: 'table', position: { x: 0, y: 1, z: 0 } },
    { id: 'products', type: 'table', position: { x: 3, y: 1, z: 0 } },
    { id: 'categories', type: 'foreign', position: { x: 3, y: -1, z: 1 } },
    { id: 'reviews', type: 'table', position: { x: 0, y: -1, z: 0 } },
    { id: 'payments', type: 'foreign', position: { x: -3, y: -1, z: 1 } },
    { id: 'idx_user', type: 'index', position: { x: -3, y: 2, z: -1 } },
    { id: 'idx_order', type: 'index', position: { x: 0, y: 2, z: -1 } }
];

const JOINS = [
    ['users', 'orders'],
    ['orders', 'products'],
    ['products', 'categories'],
    ['orders', 'reviews'],
    ['users', 'payments'],
    ['users', 'idx_user'],
    ['orders', 'idx_order']
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the databases cubic grid scene.
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

    console.log('[databases-scene] Mounting cubic grid');

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
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);

    // OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 6;
        controls.maxDistance = 25;
    }

    // Lighting
    setupLighting(scene);

    // Create table nodes
    const nodes = createNodes();
    nodes.forEach(node => scene.add(node.mesh));

    // Create join connections
    const edges = createEdges(nodes);
    edges.forEach(edge => scene.add(edge.line));

    // Create grid floor
    const grid = createGridFloor();
    scene.add(grid);

    // Interaction state
    let hoveredNode = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // Animation state
    let time = 0;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate nodes
        updateNodes(nodes, time);

        // Raycasting for hover
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes.map(n => n.mesh));

        if (intersects.length > 0) {
            const newHovered = nodes.find(n => n.mesh === intersects[0].object);
            if (newHovered !== hoveredNode) {
                // Unhighlight previous
                if (hoveredNode) {
                    hoveredNode.mesh.material.emissiveIntensity = 0.2;
                    hoveredNode.mesh.scale.setScalar(1);
                    unhighlightConnections(hoveredNode, edges);
                }
                // Highlight new
                hoveredNode = newHovered;
                hoveredNode.mesh.material.emissiveIntensity = 0.6;
                hoveredNode.mesh.scale.setScalar(1.3);
                highlightConnections(hoveredNode, edges);
                container.style.cursor = 'pointer';
            }
        } else if (hoveredNode) {
            hoveredNode.mesh.material.emissiveIntensity = 0.2;
            hoveredNode.mesh.scale.setScalar(1);
            unhighlightConnections(hoveredNode, edges);
            hoveredNode = null;
            container.style.cursor = 'default';
        }

        if (controls) controls.update();
        renderer.render(scene, camera);
    }, isVisible);

    loop.start();

    return {
        destroy: () => {
            loop.stop();
            if (controls) controls.dispose();
            nodes.forEach(n => {
                n.mesh.geometry.dispose();
                n.mesh.material.dispose();
            });
            edges.forEach(e => {
                e.line.geometry.dispose();
                e.line.material.dispose();
            });
            grid.geometry.dispose();
            grid.material.dispose();
            destroyBundle();
        },
        highlightTable: (tableId) => {
            const node = nodes.find(n => n.id === tableId);
            if (node) {
                node.mesh.material.emissiveIntensity = 0.6;
                highlightConnections(node, edges);
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

    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(10, 15, 10);
    scene.add(key);

    const fill = new THREE.PointLight(0x8b5cf6, 0.3);
    fill.position.set(-5, 5, 5);
    scene.add(fill);
}

function createNodes() {
    const nodes = [];
    const { nodeSize } = GRID_CONFIG;

    TABLES.forEach((table, index) => {
        const geometry = new THREE.BoxGeometry(nodeSize * 2, nodeSize * 2, nodeSize * 2);
        const color = COLORS[table.type] || COLORS.table;

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            metalness: 0.2,
            roughness: 0.5,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(table.position.x, table.position.y, table.position.z);

        nodes.push({
            id: table.id,
            type: table.type,
            mesh,
            basePosition: mesh.position.clone(),
            index
        });
    });

    return nodes;
}

function createEdges(nodes) {
    const edges = [];

    JOINS.forEach(([sourceId, targetId]) => {
        const source = nodes.find(n => n.id === sourceId);
        const target = nodes.find(n => n.id === targetId);

        if (source && target) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array([
                source.mesh.position.x, source.mesh.position.y, source.mesh.position.z,
                target.mesh.position.x, target.mesh.position.y, target.mesh.position.z
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({
                color: COLORS.connection,
                transparent: true,
                opacity: GRID_CONFIG.connectionOpacity
            });

            const line = new THREE.Line(geometry, material);

            edges.push({
                source: source.id,
                target: target.id,
                line,
                material
            });
        }
    });

    return edges;
}

function createGridFloor() {
    const geometry = new THREE.PlaneGeometry(20, 20, 20, 20);
    const material = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });

    const grid = new THREE.Mesh(geometry, material);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -3;

    return grid;
}

function updateNodes(nodes, time) {
    nodes.forEach((node, i) => {
        // Subtle floating
        node.mesh.position.y = node.basePosition.y + Math.sin(time + i * 0.5) * 0.05;
        // Subtle rotation
        node.mesh.rotation.y = time * 0.1 + i * 0.1;
    });
}

function highlightConnections(node, edges) {
    edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
            edge.material.color.setHex(COLORS.highlight);
            edge.material.opacity = 0.8;
        }
    });
}

function unhighlightConnections(node, edges) {
    edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
            edge.material.color.setHex(COLORS.connection);
            edge.material.opacity = GRID_CONFIG.connectionOpacity;
        }
    });
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback databases-grid-fallback';

    fallback.innerHTML = `
        <svg viewBox="-80 -60 160 120" width="100%" height="100%" style="max-height: 300px;">
            <!-- Connections -->
            <line x1="-40" y1="0" x2="0" y2="0" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="0" y1="0" x2="40" y2="0" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="-40" y1="0" x2="-40" y2="30" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="0" y1="0" x2="0" y2="30" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="40" y1="0" x2="40" y2="30" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <!-- Nodes -->
            <rect x="-50" y="-10" width="20" height="20" rx="3" fill="#8b5cf6" opacity="0.8"/>
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#8b5cf6" opacity="0.8"/>
            <rect x="30" y="-10" width="20" height="20" rx="3" fill="#8b5cf6" opacity="0.8"/>
            <rect x="-50" y="25" width="16" height="16" rx="3" fill="#14b8a6" opacity="0.7"/>
            <rect x="-8" y="25" width="16" height="16" rx="3" fill="#8b5cf6" opacity="0.8"/>
            <rect x="32" y="25" width="16" height="16" rx="3" fill="#14b8a6" opacity="0.7"/>
            <!-- Labels -->
            <text x="-40" y="3" text-anchor="middle" fill="white" font-size="6">users</text>
            <text x="0" y="3" text-anchor="middle" fill="white" font-size="6">orders</text>
            <text x="40" y="3" text-anchor="middle" fill="white" font-size="6">products</text>
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
        highlightTable: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('databases-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__databasesScene = scene;
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
