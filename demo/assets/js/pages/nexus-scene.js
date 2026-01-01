/**
 * Nexus 3D Force Graph
 * Force-directed graph visualization showing all 22 analysis engines as connected nodes.
 * 
 * @module pages/nexus-scene
 */

import { SceneCore } from '../webgl/scene-core.js';
import { Materials } from '../webgl/materials.js';
import { Perf } from '../webgl/perf.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const GRAPH_CONFIG = {
    nodeRadius: 0.3,
    nodeDetail: 1,
    edgeOpacity: 0.3,
    springStrength: 0.01,
    repulsion: 2.0,
    damping: 0.95,
    centerAttraction: 0.001
};

const CATEGORY_COLORS = {
    ml: 0x8b5cf6,        // Purple - ML & Analytics
    financial: 0x14b8a6,  // Teal - Financial Intelligence
    advanced: 0xf59e0b,   // Amber - Advanced AI Lab
    default: 0x64748b     // Gray
};

// Engine definitions with categories
const ENGINES = [
    // ML & Analytics (7)
    { id: 'titan', name: 'Titan ML', category: 'ml' },
    { id: 'clustering', name: 'Clustering', category: 'ml' },
    { id: 'anomaly', name: 'Anomaly Detection', category: 'ml' },
    { id: 'statistical', name: 'Statistical Analysis', category: 'ml' },
    { id: 'trend', name: 'Trend Analysis', category: 'ml' },
    { id: 'correlation', name: 'Correlation Engine', category: 'ml' },
    { id: 'graph', name: 'Universal Graph', category: 'ml' },

    // Financial Intelligence (12)
    { id: 'cost', name: 'Cost Optimization', category: 'financial' },
    { id: 'roi', name: 'ROI Analysis', category: 'financial' },
    { id: 'spend', name: 'Spend Patterns', category: 'financial' },
    { id: 'budget', name: 'Budget Variance', category: 'financial' },
    { id: 'margin', name: 'Margin Analysis', category: 'financial' },
    { id: 'forecast', name: 'Revenue Forecasting', category: 'financial' },
    { id: 'ltv', name: 'Customer LTV', category: 'financial' },
    { id: 'cashflow', name: 'Cash Flow', category: 'financial' },
    { id: 'inventory', name: 'Inventory Optimization', category: 'financial' },
    { id: 'pricing', name: 'Pricing Strategy', category: 'financial' },
    { id: 'basket', name: 'Market Basket', category: 'financial' },
    { id: 'resource', name: 'Resource Utilization', category: 'financial' },

    // Advanced AI Lab (3)
    { id: 'rag', name: 'RAG Evaluation', category: 'advanced' },
    { id: 'chaos', name: 'Chaos Engine', category: 'advanced' },
    { id: 'oracle', name: 'Oracle Causality', category: 'advanced' }
];

// Connections between engines (simplified)
const CONNECTIONS = [
    ['titan', 'clustering'], ['titan', 'anomaly'], ['titan', 'trend'],
    ['clustering', 'anomaly'], ['statistical', 'trend'], ['statistical', 'correlation'],
    ['correlation', 'graph'], ['cost', 'roi'], ['cost', 'margin'],
    ['spend', 'budget'], ['forecast', 'ltv'], ['cashflow', 'inventory'],
    ['pricing', 'margin'], ['basket', 'ltv'], ['rag', 'oracle'],
    ['chaos', 'oracle'], ['titan', 'rag'], ['graph', 'chaos']
];

// ============================================================================
// MAIN MOUNT FUNCTION
// ============================================================================

export function mount(container) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return mountFallback(container);
    }

    const tier = Perf.getTier();
    if (tier === 1) { // Low tier
        return mountFallback(container);
    }

    console.log('[nexus-scene] Mounting 3D force graph');

    // Init SceneCore
    const sceneCore = new SceneCore(container.id, {
        alpha: true,
        antialias: true
    });

    if (!sceneCore.renderer) {
        return mountFallback(container);
    }

    const { scene, camera, renderer } = sceneCore;

    // Camera setup
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);

    // Add OrbitControls if available
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 8;
        controls.maxDistance = 40;
    }

    // Setup lighting
    setupLighting(scene);

    // Create graph nodes and edges
    const nodes = createNodes();
    const edges = createEdges(nodes);

    nodes.forEach(node => scene.add(node.mesh));
    edges.forEach(edge => scene.add(edge.line));

    // Interaction state
    let hoveredNode = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Mouse handlers
    renderer.domElement.addEventListener('mousemove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // Animation loop (using SceneCore)
    sceneCore.animate((time, delta) => {
        // Physics simulation
        simulateForces(nodes, edges, delta);

        // Update node positions
        nodes.forEach(node => {
            node.mesh.position.copy(node.position);
            // Gentle float
            node.mesh.position.y += Math.sin(time * 0.5 + node.index * 0.5) * 0.05;
        });

        // Update edge positions
        edges.forEach(edge => {
            updateEdge(edge);
        });

        // Raycasting for hover
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodes.map(n => n.mesh));

        if (intersects.length > 0) {
            const newHovered = nodes.find(n => n.mesh === intersects[0].object);
            if (newHovered !== hoveredNode) {
                if (hoveredNode) {
                    hoveredNode.mesh.material.emissiveIntensity = 0.2;
                    hoveredNode.mesh.scale.setScalar(1);
                }
                hoveredNode = newHovered;
                // Highlight
                hoveredNode.mesh.material.emissiveIntensity = 0.6;
                hoveredNode.mesh.scale.setScalar(1.3);
                renderer.domElement.style.cursor = 'pointer';
            }
        } else if (hoveredNode) {
            hoveredNode.mesh.material.emissiveIntensity = 0.2;
            hoveredNode.mesh.scale.setScalar(1);
            hoveredNode = null;
            renderer.domElement.style.cursor = 'default';
        }

        // Update controls
        if (controls) controls.update();
    });

    return {
        destroy: () => {
            sceneCore.dispose();
            if (controls) controls.dispose();
            nodes.forEach(n => {
                n.mesh.geometry.dispose();
                n.mesh.material.dispose();
            });
            edges.forEach(e => {
                e.line.geometry.dispose();
                e.line.material.dispose();
            });
        },
        getNodes: () => nodes,
        highlightNode: (id) => {
            const node = nodes.find(n => n.id === id);
            if (node) {
                camera.lookAt(node.position);
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
    key.position.set(5, 10, 5);
    scene.add(key);

    const fill = new THREE.PointLight(0x14b8a6, 0.4);
    fill.position.set(-5, -5, 5);
    scene.add(fill);
}

function createNodes() {
    const nodes = [];
    const geometry = new THREE.IcosahedronGeometry(GRAPH_CONFIG.nodeRadius, GRAPH_CONFIG.nodeDetail);

    ENGINES.forEach((engine, index) => {
        const color = CATEGORY_COLORS[engine.category] || CATEGORY_COLORS.default;

        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            metalness: 0.3,
            roughness: 0.5
        });

        const mesh = new THREE.Mesh(geometry.clone(), material);

        // Initial random position in cluster by category
        const categoryOffset = {
            ml: { x: -4, y: 2, z: 0 },
            financial: { x: 4, y: 0, z: 0 },
            advanced: { x: 0, y: -3, z: 3 }
        };

        const offset = categoryOffset[engine.category] || { x: 0, y: 0, z: 0 };

        const position = new THREE.Vector3(
            offset.x + (Math.random() - 0.5) * 5,
            offset.y + (Math.random() - 0.5) * 5,
            offset.z + (Math.random() - 0.5) * 5
        );

        mesh.position.copy(position);

        nodes.push({
            id: engine.id,
            name: engine.name,
            category: engine.category,
            mesh,
            position,
            velocity: new THREE.Vector3(),
            index
        });
    });

    return nodes;
}

function createEdges(nodes) {
    const edges = [];
    const material = new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: GRAPH_CONFIG.edgeOpacity
    });

    CONNECTIONS.forEach(([sourceId, targetId]) => {
        const source = nodes.find(n => n.id === sourceId);
        const target = nodes.find(n => n.id === targetId);

        if (source && target) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const line = new THREE.Line(geometry, material.clone());

            edges.push({ source, target, line });
        }
    });

    return edges;
}

function updateEdge(edge) {
    const positions = edge.line.geometry.attributes.position.array;
    positions[0] = edge.source.position.x;
    positions[1] = edge.source.position.y;
    positions[2] = edge.source.position.z;
    positions[3] = edge.target.position.x;
    positions[4] = edge.target.position.y;
    positions[5] = edge.target.position.z;
    edge.line.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// PHYSICS SIMULATION
// ============================================================================

function simulateForces(nodes, edges, delta) {
    const clampedDelta = Math.min(delta, 0.05);

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];

            const diff = nodeA.position.clone().sub(nodeB.position);
            const distance = diff.length();

            if (distance < 0.1) continue;

            const force = diff.normalize().multiplyScalar(GRAPH_CONFIG.repulsion / (distance * distance));

            nodeA.velocity.add(force.clone().multiplyScalar(clampedDelta));
            nodeB.velocity.sub(force.clone().multiplyScalar(clampedDelta));
        }
    }

    // Spring forces along edges
    edges.forEach(edge => {
        const diff = edge.target.position.clone().sub(edge.source.position);
        const distance = diff.length();
        const targetDistance = 4;

        const force = diff.normalize().multiplyScalar((distance - targetDistance) * GRAPH_CONFIG.springStrength);

        edge.source.velocity.add(force.clone().multiplyScalar(clampedDelta));
        edge.target.velocity.sub(force.clone().multiplyScalar(clampedDelta));
    });

    // Center attraction
    nodes.forEach(node => {
        const toCenter = node.position.clone().negate();
        node.velocity.add(toCenter.multiplyScalar(GRAPH_CONFIG.centerAttraction * clampedDelta));
    });

    // Apply velocity with damping
    nodes.forEach(node => {
        node.velocity.multiplyScalar(GRAPH_CONFIG.damping);
        node.position.add(node.velocity);
    });
}

// ============================================================================
// FALLBACK
// ============================================================================

function mountFallback(container) {
    const fallback = document.createElement('div');
    fallback.className = 'scene-fallback nexus-graph-fallback';

    // Create simple 2D network visualization
    fallback.innerHTML = `
        <svg viewBox="-100 -100 200 200" width="100%" height="100%" style="max-height: 400px;">
            <defs>
                <radialGradient id="node-glow">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                </radialGradient>
            </defs>
            <!-- ML Cluster -->
            <g transform="translate(-40, -30)">
                <circle r="25" fill="url(#node-glow)" opacity="0.3"/>
                <circle r="8" fill="#8b5cf6"/>
                <text y="18" text-anchor="middle" fill="#64748b" font-size="6">ML</text>
            </g>
            <!-- Financial Cluster -->
            <g transform="translate(40, 10)">
                <circle r="30" fill="url(#node-glow)" opacity="0.3"/>
                <circle r="10" fill="#14b8a6"/>
                <text y="20" text-anchor="middle" fill="#64748b" font-size="6">Financial</text>
            </g>
            <!-- Advanced Cluster -->
            <g transform="translate(0, 50)">
                <circle r="20" fill="url(#node-glow)" opacity="0.3"/>
                <circle r="6" fill="#f59e0b"/>
                <text y="14" text-anchor="middle" fill="#64748b" font-size="6">Advanced</text>
            </g>
            <!-- Connections -->
            <line x1="-32" y1="-22" x2="30" y2="2" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="30" y1="18" x2="0" y2="44" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
            <line x1="-32" y1="-22" x2="0" y2="44" stroke="#94a3b8" stroke-width="1" opacity="0.3"/>
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
        getNodes: () => [],
        highlightNode: () => { }
    };
}

// ============================================================================
// AUTO-MOUNT
// ============================================================================

export function autoMount() {
    const container = document.getElementById('nexus-graph');
    if (container) {
        const scene = mount(container);
        window.__nexusScene = scene;
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
}
