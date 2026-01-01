/**
 * Inventory Optimization Visualization ("3D Warehouse")
 * Renders 3D city/block view of inventory items.
 *
 * @module nexus/visualizations/engines/financial/inventory
 */

import { SceneCore } from '../../../../webgl/scene-core.js';
import { VIZ_COLORS } from '../../core/viz-utils.js';

// ============================================================================
// HTML Section Builder
// ============================================================================

export function buildSection(data, vizId) {
    if (!data) return '';
    const items = data?.items || data?.inventory || [];

    return `
        <div class="engine-viz-section fin-viz-premium">
            <div class="fin-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5>Inventory Warehouse</h5>
                <div class="fin-stats" style="font-size: 0.9rem; color: var(--vox-grey-600);">
                    ${items.length} SKUs Optimized
                </div>
            </div>
            
            <!-- WebGL Container -->
            <div class="inventory-3d-container scene-shell" id="inventory-${vizId}" style="height: 450px; width: 100%; position: relative;"></div>
            
            <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 2rem; font-size: 0.8rem; color: var(--vox-grey-500);">
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="width:12px; height:12px; background:#10b981; border-radius:2px;"></span> High Turnover</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="width:12px; height:12px; background:#f59e0b; border-radius:2px;"></span> Medium</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="width:12px; height:12px; background:#ef4444; border-radius:2px;"></span> Low/Stagnant</div>
            </div>
        </div>
    `;
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    const containerId = `inventory-${vizId}`;
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

    // Camera setup - Isometric-ish
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2.2; // Keep above floor
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        sceneCore.controls = controls;
    }

    // --- Create Warehouse Geometry ---
    const items = data?.items || data?.inventory || [];
    const group = createWarehouseBlocks(items);
    sceneCore.add(group);

    // Floor
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8, metalness: 0.1 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    sceneCore.add(plane);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    sceneCore.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 5);
    dirLight.castShadow = true;
    sceneCore.add(dirLight);

    // Animation Loop
    sceneCore.animate((time) => {
        if (sceneCore.controls) sceneCore.controls.update();
    });
}

function createWarehouseBlocks(items) {
    const group = new THREE.Group();

    // Grid layout
    const cols = Math.ceil(Math.sqrt(items.length));
    const spacing = 1.2;
    const offset = (cols * spacing) / 2;

    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    // Move pivot to bottom
    geometry.translate(0, 0.5, 0);

    items.forEach((item, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        // Color by turnover
        const turnover = item.turnover || item.turnover_rate || Math.random();
        let color = 0xef4444; // Low
        if (turnover > 0.7) color = 0x10b981; // High
        else if (turnover > 0.4) color = 0xf59e0b; // Med

        // Height by value/quantity
        const value = item.value || item.quantity || 100;
        const heightScale = Math.max(0.2, Math.min(4, value / 100));

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            (col * spacing) - offset,
            0,
            (row * spacing) - offset
        );
        mesh.scale.y = heightScale;

        group.add(mesh);

        // Add wireframe edge for definition
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
        mesh.add(line);
    });

    return group;
}

function renderFallback(container) {
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">3D Warehouse View Unavailable</p>`;
}
