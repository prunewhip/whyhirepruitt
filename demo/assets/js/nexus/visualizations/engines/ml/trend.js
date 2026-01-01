/**
 * Trend Analysis Visualization
 * Renders 3D Trend Ribbons using WebGL/Three.js
 *
 * @module nexus/visualizations/engines/ml/trend
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
        <div class="engine-viz-section">
            <h5>3D Trend Analysis</h5>
            <div class="trend-container scene-shell" id="trend-${vizId}" style="height: 400px; width: 100%; position: relative;"></div>
        </div>
    `;
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    const containerId = `trend-${vizId}`;
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
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Controls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
    }

    // Process Data
    const dates = data?.dates || data?.x_data || data?.x || [];
    const values = data?.values || data?.y_data || data?.y || [];
    const trend = data?.trend_line || data?.trend || [];

    if (!dates.length) return;

    // Normalize Data to Fit in 3D Box (-2 to 2)
    const normalized = normalizeData(values, trend);

    // Create Ribbons
    const valueRibbon = createRibbon(normalized.values, 0x2B7FD4); // Blue for actual
    const trendRibbon = createRibbon(normalized.trend, 0xF59E0B); // Amber for trend

    // Shift Z slighty to separate
    valueRibbon.position.z = 0.5;
    trendRibbon.position.z = -0.5;

    sceneCore.add(valueRibbon);
    sceneCore.add(trendRibbon);

    // Add Grid/Axis
    const grid = new THREE.GridHelper(8, 8, 0x94a3b8, 0x334155);
    sceneCore.add(grid);

    // Ambient Light
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    sceneCore.add(ambient);

    // Animation Loop
    sceneCore.animate((time) => {
        if (controls) controls.update();

        // Wavy shader effect or just movement
        valueRibbon.rotation.x = Math.sin(time * 0.5) * 0.05;
        trendRibbon.rotation.x = Math.sin(time * 0.5 + 1) * 0.05;
    });
}

function normalizeData(values, trend) {
    const all = [...values, ...(trend || [])];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = max - min || 1;

    const normValues = values.map((v, i) => ({
        x: (i / (values.length - 1)) * 6 - 3, // Map to -3 to 3 width
        y: ((v - min) / range) * 3 - 1.5,      // Map to -1.5 to 1.5 height
        z: 0
    }));

    const normTrend = trend && trend.length ? trend.map((v, i) => ({
        x: (i / (trend.length - 1)) * 6 - 3,
        y: ((v - min) / range) * 3 - 1.5,
        z: 0
    })) : [];

    return { values: normValues, trend: normTrend };
}

function createRibbon(points, colorHex) {
    if (!points.length) return new THREE.Object3D();

    // Create a ribbon by extruding a shape along the path
    const path = new THREE.CatmullRomCurve3(
        points.map(p => new THREE.Vector3(p.x, p.y, p.z))
    );

    const tubularSegments = points.length * 4;
    const radius = 0.1;
    const radialSegments = 8;
    const closed = false;

    const geometry = new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, closed);
    const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.2,
        emissive: colorHex,
        emissiveIntensity: 0.2
    });

    return new THREE.Mesh(geometry, material);
}

function renderFallback(container) {
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">3D Trend View Unavailable</p>`;
}
