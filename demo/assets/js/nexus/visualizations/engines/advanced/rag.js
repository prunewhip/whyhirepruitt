/**
 * RAG Evaluation Visualization ("RAG Knowledge Graph")
 * Renders 3D network of retrieved documents and query nodes.
 *
 * @module nexus/visualizations/engines/advanced/rag
 */

import { SceneCore } from '../../../../webgl/scene-core.js';
import { Materials } from '../../../../webgl/materials.js';
import { VIZ_COLORS } from '../../core/viz-utils.js';

// ============================================================================
// HTML Section Builder
// ============================================================================

export function buildSection(data, vizId) {
    if (!data) return '';
    return `
        <div class="engine-viz-section advanced-viz-hero">
            <div class="fin-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5>RAG Knowledge Graph</h5>
                <div class="fin-stats" style="font-size: 0.9rem; color: var(--vox-grey-600);">
                    Precision: <span style="font-weight: 700; color:${VIZ_COLORS.primary}">${(data.precision || 0).toFixed(2)}</span>
                </div>
            </div>
            
            <!-- WebGL Container -->
            <div class="rag-3d-container scene-shell" id="rag-${vizId}" style="height: 450px; width: 100%; position: relative;"></div>
            
            <div style="margin-top: 1rem; text-align: center; font-size: 0.85rem; color: var(--vox-grey-500);">
                Query (Center) &bull; Retrieved Chunks (Orbiting) &bull; Ground Truth (Green)
            </div>
        </div>
    `;
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    const containerId = `rag-${vizId}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // init Scene
    const sceneCore = new SceneCore(containerId, {
        alpha: true,
        antialias: true
    });

    if (!sceneCore.renderer) {
        renderFallback(container);
        return;
    }

    const { scene, camera, renderer } = sceneCore;

    // Camera setup
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        sceneCore.controls = controls;
    }

    // --- Create Graph ---
    const group = createRAGGraph(data);
    sceneCore.add(group);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    sceneCore.add(ambient);

    const pointLight = new THREE.PointLight(0x6366f1, 1, 100);
    pointLight.position.set(0, 0, 0);
    sceneCore.add(pointLight);

    // Animation Loop
    sceneCore.animate((time) => {
        if (sceneCore.controls) sceneCore.controls.update();

        // Pulse effects
        if (group.userData.queryNode) {
            const scale = 1 + Math.sin(time * 3) * 0.1;
            group.userData.queryNode.scale.setScalar(scale);
        }

        // Float nodes
        if (group.userData.chunkNodes) {
            group.userData.chunkNodes.forEach((node, i) => {
                node.position.y += Math.sin(time + i) * 0.005;
            });
        }
    });
}

function createRAGGraph(data) {
    const group = new THREE.Group();
    const chunkNodes = [];

    // 1. Central Query Node
    const queryGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const queryMat = new THREE.MeshPhysicalMaterial({
        color: 0x6366f1, // Indigo
        emissive: 0x4f46e5,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.9
    });
    const queryNode = new THREE.Mesh(queryGeo, queryMat);
    group.add(queryNode);
    group.userData.queryNode = queryNode;

    // 2. Mock Chunks/Documents nodes
    // Use data.retrieved_docs or simulate
    const count = 8;
    const radius = 6;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = (Math.random() - 0.5) * 4;
        const z = Math.sin(angle) * radius;

        // Determine type (Relevant vs Irrelevant)
        // Mock: First 3 are relevant (Green), others noise (Grey/Red)
        const isRelevant = i < 3;
        const color = isRelevant ? 0x10b981 : 0x94a3b8;

        const chunkGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1); // Page shape
        const chunkMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.1
        });

        const chunk = new THREE.Mesh(chunkGeo, chunkMat);
        chunk.position.set(x, y, z);
        chunk.lookAt(0, 0, 0);

        group.add(chunk);
        chunkNodes.push(chunk);

        // Connection Line
        const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
    }

    group.userData.chunkNodes = chunkNodes;

    // 3. Particles
    const particles = createParticles();
    group.add(particles);

    return group;
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 100;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 20;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
    });

    return new THREE.Points(geometry, material);
}

function renderFallback(container) {
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">3D Knowledge Graph Unavailable</p>`;
}
