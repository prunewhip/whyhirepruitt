/**
 * Automation Node-Link
 * Workflow automation visualization with node connections and ghost trails.
 * 
 * @module pages/automation-scene
 */

import { initScene, createAnimationLoop, prefersReducedMotion, lazyMount } from '../webgl/scene-core.js';
import { VIZ_COLORS } from '../webgl/materials.js';
import { detectGPUTier, GPU_TIER } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const NODE_CONFIG = {
    size: 0.35,
    spacing: 3,
    connectionOpacity: 0.4,
    trailLength: 10
};

const COLORS = {
    trigger: 0xf59e0b,    // Amber - triggers
    action: 0x8b5cf6,     // Purple - actions
    condition: 0x3b82f6,  // Blue - conditions
    output: 0x10b981,     // Green - outputs
    connection: 0x94a3b8, // Gray - connections
    active: 0x14b8a6      // Teal - active flow
};

// Workflow nodes
const WORKFLOW_NODES = [
    { id: 'trigger', type: 'trigger', position: { x: -6, y: 0, z: 0 }, label: 'New Lead' },
    { id: 'filter', type: 'condition', position: { x: -3, y: 1, z: 0 }, label: 'Check Score' },
    { id: 'enrich', type: 'action', position: { x: 0, y: 1.5, z: 0 }, label: 'Enrich Data' },
    { id: 'route', type: 'condition', position: { x: 0, y: -1, z: 0 }, label: 'Route' },
    { id: 'assign', type: 'action', position: { x: 3, y: 1, z: 0 }, label: 'Assign Rep' },
    { id: 'notify', type: 'action', position: { x: 3, y: -1, z: 0 }, label: 'Send Slack' },
    { id: 'create', type: 'output', position: { x: 6, y: 0, z: 0 }, label: 'Create Opp' }
];

const WORKFLOW_EDGES = [
    { from: 'trigger', to: 'filter' },
    { from: 'filter', to: 'enrich' },
    { from: 'filter', to: 'route' },
    { from: 'enrich', to: 'assign' },
    { from: 'route', to: 'notify' },
    { from: 'assign', to: 'create' },
    { from: 'notify', to: 'create' }
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

/**
 * Mount the automation node-link scene.
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

    console.log('[automation-scene] Mounting node-link workflow');

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
    camera.position.set(0, 5, 12);
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

    // Create nodes
    const nodes = createNodes();
    nodes.forEach(node => scene.add(node.mesh));

    // Create edges
    const edges = createEdges(nodes);
    edges.forEach(edge => scene.add(edge.line));

    // Create flow particles (ghost trails)
    const flowParticles = createFlowParticles(edges);
    scene.add(flowParticles.points);

    // Animation state
    let time = 0;

    // Animation loop
    const loop = createAnimationLoop((delta) => {
        time += delta;

        // Animate nodes
        updateNodes(nodes, time);

        // Animate flow particles
        updateFlowParticles(flowParticles, edges, time);

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
            flowParticles.dispose();
            destroyBundle();
        },
        triggerFlow: () => {
            console.log('[automation-scene] Flow triggered');
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
    key.position.set(5, 10, 5);
    scene.add(key);

    const fill = new THREE.PointLight(0x8b5cf6, 0.3);
    fill.position.set(-5, 5, 5);
    scene.add(fill);
}

function createNodes() {
    const nodes = [];

    WORKFLOW_NODES.forEach((nodeData, index) => {
        // Use different geometry based on type
        let geometry;
        switch (nodeData.type) {
            case 'trigger':
                geometry = new THREE.ConeGeometry(NODE_CONFIG.size, NODE_CONFIG.size * 2, 6);
                break;
            case 'condition':
                geometry = new THREE.OctahedronGeometry(NODE_CONFIG.size);
                break;
            case 'output':
                geometry = new THREE.DodecahedronGeometry(NODE_CONFIG.size);
                break;
            default:
                geometry = new THREE.BoxGeometry(NODE_CONFIG.size * 1.5, NODE_CONFIG.size, NODE_CONFIG.size);
        }

        const color = COLORS[nodeData.type] || COLORS.action;
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            metalness: 0.2,
            roughness: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(nodeData.position.x, nodeData.position.y, nodeData.position.z);

        nodes.push({
            id: nodeData.id,
            type: nodeData.type,
            label: nodeData.label,
            mesh,
            basePosition: mesh.position.clone(),
            index
        });
    });

    return nodes;
}

function createEdges(nodes) {
    const edges = [];

    WORKFLOW_EDGES.forEach(edgeData => {
        const fromNode = nodes.find(n => n.id === edgeData.from);
        const toNode = nodes.find(n => n.id === edgeData.to);

        if (fromNode && toNode) {
            const points = [
                fromNode.mesh.position.clone(),
                toNode.mesh.position.clone()
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: COLORS.connection,
                transparent: true,
                opacity: NODE_CONFIG.connectionOpacity
            });

            const line = new THREE.Line(geometry, material);

            edges.push({
                from: edgeData.from,
                to: edgeData.to,
                line,
                startPos: fromNode.mesh.position.clone(),
                endPos: toNode.mesh.position.clone()
            });
        }
    });

    return edges;
}

function createFlowParticles(edges) {
    const particlesPerEdge = 3;
    const count = edges.length * particlesPerEdge;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const progresses = new Float32Array(count);
    const edgeIndices = new Float32Array(count);

    const activeColor = new THREE.Color(COLORS.active);

    for (let i = 0; i < count; i++) {
        const edgeIndex = Math.floor(i / particlesPerEdge);
        const edge = edges[edgeIndex];

        // Random progress along edge
        progresses[i] = Math.random();
        edgeIndices[i] = edgeIndex;

        // Initial position
        const t = progresses[i];
        positions[i * 3] = edge.startPos.x + (edge.endPos.x - edge.startPos.x) * t;
        positions[i * 3 + 1] = edge.startPos.y + (edge.endPos.y - edge.startPos.y) * t;
        positions[i * 3 + 2] = edge.startPos.z + (edge.endPos.z - edge.startPos.z) * t;

        colors[i * 3] = activeColor.r;
        colors[i * 3 + 1] = activeColor.g;
        colors[i * 3 + 2] = activeColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);

    return {
        points,
        progresses,
        edgeIndices,
        dispose: () => {
            geometry.dispose();
            material.dispose();
        }
    };
}

function updateNodes(nodes, time) {
    nodes.forEach((node, i) => {
        // Subtle floating
        node.mesh.position.y = node.basePosition.y + Math.sin(time + i * 0.5) * 0.05;
        // Subtle rotation
        node.mesh.rotation.y = time * 0.3 + i * 0.2;
    });
}

function updateFlowParticles(flowParticles, edges, time) {
    const positions = flowParticles.points.geometry.attributes.position.array;
    const count = flowParticles.progresses.length;

    for (let i = 0; i < count; i++) {
        // Move particle along edge
        flowParticles.progresses[i] += 0.005;

        // Reset when reaching end
        if (flowParticles.progresses[i] > 1) {
            flowParticles.progresses[i] = 0;
        }

        const edgeIndex = Math.floor(flowParticles.edgeIndices[i]);
        const edge = edges[edgeIndex];
        const t = flowParticles.progresses[i];

        // Update position
        positions[i * 3] = edge.startPos.x + (edge.endPos.x - edge.startPos.x) * t;
        positions[i * 3 + 1] = edge.startPos.y + (edge.endPos.y - edge.startPos.y) * t;
        positions[i * 3 + 2] = edge.startPos.z + (edge.endPos.z - edge.startPos.z) * t;
    }

    flowParticles.points.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback automation-nodelink-fallback';

    fallback.innerHTML = `
        <svg viewBox="-80 -40 160 80" width="100%" height="100%" style="max-height: 250px;">
            <!-- Edges -->
            <line x1="-60" y1="0" x2="-30" y2="10" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="-30" y1="10" x2="0" y2="15" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="-30" y1="10" x2="0" y2="-10" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="0" y1="15" x2="30" y2="10" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="0" y1="-10" x2="30" y2="-10" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="30" y1="10" x2="60" y2="0" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <line x1="30" y1="-10" x2="60" y2="0" stroke="#94a3b8" stroke-width="1" opacity="0.4"/>
            <!-- Nodes -->
            <polygon points="-60,-8 -52,0 -60,8 -68,0" fill="#f59e0b"/>
            <rect x="-38" y="2" width="16" height="16" rx="2" fill="#3b82f6"/>
            <rect x="-8" y="7" width="16" height="16" rx="2" fill="#8b5cf6"/>
            <polygon points="0,-10 8,-2 0,6 -8,-2" fill="#3b82f6"/>
            <rect x="22" y="2" width="16" height="16" rx="2" fill="#8b5cf6"/>
            <rect x="22" y="-18" width="16" height="16" rx="2" fill="#8b5cf6"/>
            <circle cx="60" cy="0" r="8" fill="#10b981"/>
            <!-- Labels -->
            <text x="-60" y="20" text-anchor="middle" fill="#64748b" font-size="6">Trigger</text>
            <text x="60" y="20" text-anchor="middle" fill="#64748b" font-size="6">Output</text>
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
        triggerFlow: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('automation-viz');
    if (container) {
        lazyMount(container, () => {
            const scene = mount(container);
            window.__automationScene = scene;
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
