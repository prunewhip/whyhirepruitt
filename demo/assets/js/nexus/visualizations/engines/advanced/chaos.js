/**
 * Chaos Analysis Visualization ("Entropy Spheres")
 * Renders 3D unstable spheres representing system chaos/entropy.
 *
 * @module nexus/visualizations/engines/advanced/chaos
 */

import { SceneCore } from '../../../../webgl/scene-core.js';
import { Materials } from '../../../../webgl/materials.js';
import { VIZ_COLORS } from '../../core/viz-utils.js';

// ============================================================================
// HTML Section Builder
// ============================================================================

export function buildSection(data, vizId) {
    if (!data) return '';
    const score = data.chaos_score || 0.45;

    return `
        <div class="engine-viz-section advanced-viz-hero">
            <div class="fin-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5>Chaos Entropy Visualizer</h5>
                <div class="fin-stats" style="font-size: 0.9rem; color: var(--vox-grey-600);">
                    Instability Index: <span style="font-weight: 700; color:${getChaosColor(score)}">${(score * 100).toFixed(1)}%</span>
                </div>
            </div>
            
            <!-- WebGL Container -->
            <div class="chaos-3d-container scene-shell" id="chaos-${vizId}" style="height: 450px; width: 100%; position: relative;"></div>
            
            <div style="margin-top: 1rem; text-align: center; font-size: 0.85rem; color: var(--vox-grey-500);">
                System Stability: <span style="color:#d946ef;">Correlated (Pink)</span> vs <span style="color:#f59e0b;">Random (Amber)</span>
            </div>
        </div>
    `;
}

function getChaosColor(score) {
    if (score > 0.7) return '#d946ef'; // High Chaos - Pink/Purple
    if (score > 0.4) return '#f59e0b'; // Med - Amber
    return '#10b981'; // Low - Green
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    const containerId = `chaos-${vizId}`;
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
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0; // Fast spin for chaos
        sceneCore.controls = controls;
    }

    // --- Create Chaos Geometry ---
    const score = data.chaos_score || 0.5;
    const group = createEntropySpheres(score);
    sceneCore.add(group);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    sceneCore.add(ambient);

    const spot = new THREE.SpotLight(0xffffff, 1);
    spot.position.set(10, 10, 10);
    sceneCore.add(spot);

    // Animation Loop
    sceneCore.animate((time) => {
        if (sceneCore.controls) sceneCore.controls.update();

        // Morph the spheres
        if (group.userData.spheres) {
            group.userData.spheres.forEach((mesh, i) => {
                const noise = Math.sin(time * (2 + i) + mesh.userData.seed);
                const scale = 1 + noise * (0.1 + score * 0.3); // More chaos = more deformation
                mesh.scale.setScalar(scale);

                mesh.rotation.x += 0.01 * (i + 1);
                mesh.rotation.z -= 0.02 * (i + 1);
            });
        }
    });
}

function createEntropySpheres(score) {
    const group = new THREE.Group();
    const spheres = [];

    // Core Sphere
    const geo = new THREE.IcosahedronGeometry(2, 4); // Detailed
    const mat = new THREE.MeshPhysicalMaterial({
        color: score > 0.5 ? 0xd946ef : 0x14b8a6,
        metalness: 0.5,
        roughness: 0.2,
        wireframe: true,
        emissive: score > 0.5 ? 0xd946ef : 0x14b8a6,
        emissiveIntensity: 0.4
    });

    const core = new THREE.Mesh(geo, mat);
    core.userData.seed = Math.random() * 100;
    group.add(core);
    spheres.push(core);

    // Orbiting "Electron" Spheres (Chaotic agents)
    const count = Math.floor(score * 10) + 3; // More chaos = more spheres

    for (let i = 0; i < count; i++) {
        const rad = 0.3 + Math.random() * 0.5;
        const dist = 3 + Math.random() * 3;
        const subGeo = new THREE.SphereGeometry(rad, 16, 16);
        const subMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.4
        });

        const mesh = new THREE.Mesh(subGeo, subMat);

        // Position randomly on sphere shell
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        mesh.position.set(
            dist * Math.sin(phi) * Math.cos(theta),
            dist * Math.sin(phi) * Math.sin(theta),
            dist * Math.cos(phi)
        );

        mesh.userData.seed = Math.random() * 100;

        group.add(mesh);
        spheres.push(mesh);

        // Connect to center
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), mesh.position]);
        const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
        group.add(line);
    }

    group.userData.spheres = spheres;
    return group;
}

function renderFallback(container) {
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">3D Chaos View Unavailable</p>`;
}
