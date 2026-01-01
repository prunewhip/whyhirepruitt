/**
 * Cash Flow Visualization ("River of Value")
 * Renders 3D flowing pipes representing income and expenses.
 *
 * @module nexus/visualizations/engines/financial/cashflow
 */

import { SceneCore } from '../../../../webgl/scene-core.js';
import { VIZ_COLORS } from '../../core/viz-utils.js';

// ============================================================================
// Data Helper
// ============================================================================

function getSummary(data) {
    // If we have explicit summary, use it
    if (data?.summary?.total_inflow && data?.summary?.total_outflow) {
        return {
            total_inflow: data.summary.total_inflow,
            total_outflow: data.summary.total_outflow,
            net_flow: data.summary.total_inflow - data.summary.total_outflow
        };
    }

    // Otherwise sum from arrays
    let inflow = 0;
    let outflow = 0;

    if (Array.isArray(data?.inflows)) {
        inflow = data.inflows.reduce((a, b) => a + b, 0);
    }

    if (Array.isArray(data?.outflows)) {
        outflow = data.outflows.reduce((a, b) => a + b, 0);
    }

    // Fallback constants if absolutely no data (to avoid empty screen)
    if (inflow === 0 && outflow === 0) {
        inflow = 100; // Visual placeholder
        outflow = 80; // Visual placeholder
    }

    return {
        total_inflow: inflow,
        total_outflow: outflow,
        net_flow: inflow - outflow
    };
}

// ============================================================================
// HTML Section Builder
// ============================================================================

export function buildSection(data, vizId) {
    if (!data) return '';

    const summary = getSummary(data);

    return `
        <div class="engine-viz-section fin-viz-premium">
            <div class="fin-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5>Cash Flow River</h5>
                <div class="fin-stats" style="display: flex; gap: 1.5rem; font-size: 0.9rem;">
                    <div style="color: var(--vox-success);"> In: <span style="font-weight: 700;">$${formatK(summary.total_inflow)}</span></div>
                    <div style="color: var(--vox-danger);"> Out: <span style="font-weight: 700;">$${formatK(summary.total_outflow)}</span></div>
                </div>
            </div>
            
            <!-- WebGL Container -->
            <div class="cashflow-3d-container scene-shell" id="cashflow-${vizId}" style="height: 450px; width: 100%; position: relative;"></div>
            
            <div style="margin-top: 1rem; text-align: center; font-size: 0.85rem; color: var(--vox-grey-500);">
                3D River of Value: Green = Inflow, Red = Outflow, Blue = Net Flow
            </div>
        </div>
    `;
}

function formatK(num) {
    if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num > 1000) return (num / 1000).toFixed(0) + 'k';
    return num;
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    const containerId = `cashflow-${vizId}`;
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
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = false; // Keep it contained
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        sceneCore.controls = controls; // Store for update
    }

    // --- Create River Geometry ---
    const flows = extractFlows(data);

    flows.forEach((flow, index) => {
        const pipe = createFlowPipe(flow, index, flows.length);
        sceneCore.add(pipe.mesh);

        // Add to animation list specifically
        if (!sceneCore.animatedObjects) sceneCore.animatedObjects = [];
        sceneCore.animatedObjects.push(pipe);
    });

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    sceneCore.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    sceneCore.add(dirLight);

    // Animation Loop
    sceneCore.animate((time) => {
        if (sceneCore.controls) sceneCore.controls.update();

        // Animate textures flow
        if (sceneCore.animatedObjects) {
            sceneCore.animatedObjects.forEach(obj => {
                if (obj.material && obj.material.map) {
                    obj.material.map.offset.x -= 0.005 * obj.flowSpeed;
                }
            });
        }
    });
}

function extractFlows(data) {
    const summary = getSummary(data);
    const inflow = summary.total_inflow;
    const outflow = summary.total_outflow;
    const net = summary.net_flow;

    // Create normalized visual streams
    // Normalize speed slightly based on magnitude relative to each other
    const maxVal = Math.max(inflow, outflow, Math.abs(net)) || 1;

    return [
        { type: 'inflow', value: inflow, color: 0x10b981, speed: 1.0 + (inflow / maxVal) },
        { type: 'outflow', value: outflow, color: 0xef4444, speed: 1.0 + (outflow / maxVal) },
        { type: 'net', value: Math.abs(net), color: 0x3b82f6, speed: 0.5 + (Math.abs(net) / maxVal) }
    ];
}

function createFlowPipe(flow, index, total) {
    // Generate a curvy path
    const pathPoints = [];
    const zOffset = (index - (total - 1) / 2) * 2.5; // Spread on Z

    for (let i = 0; i <= 10; i++) {
        const x = (i - 5) * 2;
        const y = Math.sin(i * 0.5 + index) * 1.5; // Wavy
        pathPoints.push(new THREE.Vector3(x, y, zOffset));
    }

    const path = new THREE.CatmullRomCurve3(pathPoints);
    const radius = Math.max(0.2, (flow.value / 200000) * 0.8); // Normalize scale roughly

    const geometry = new THREE.TubeGeometry(path, 64, radius, 12, false);

    // Create texture for flow
    const texture = createFlowTexture(flow.color);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 1);

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.3,
        emissive: flow.color,
        emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);

    return { mesh, material, flowSpeed: flow.speed };
}

function createFlowTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#' + new THREE.Color(colorHex).getHexString();
    ctx.fillRect(0, 0, 512, 64);

    // Add "flow" lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 512;
        const width = 20 + Math.random() * 50;
        ctx.fillRect(x, 0, width, 64);
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

function renderFallback(container) {
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">3D Cash Flow View Unavailable</p>`;
}
