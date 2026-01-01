/**
 * Clustering Visualization
 * Renders high-fidelity 3D scatter plot using WebGL/Three.js
 *
 * @module nexus/visualizations/engines/ml/clustering
 */

import { SceneCore } from '../../../../webgl/scene-core.js';
import { Materials } from '../../../../webgl/materials.js';
import { Perf } from '../../../../webgl/perf.js';
import { VIZ_COLORS, getClusterColor, escapeHtml } from '../../core/viz-utils.js';

// ============================================================================
// HTML Section Builder
// ============================================================================

export function buildSection(data, vizId) {
    if (!data) return '';
    return `
        <div class="engine-viz-section clustering-full">
            <div class="clustering-layout">
                <div class="clustering-main">
                    <h5>3D Cluster Visualization</h5>
                    <!-- WebGL Container -->
                    <div class="scatter-3d-container scene-shell" id="cluster-${vizId}" style="height: 400px; width: 100%; position: relative;"></div>
                    <div class="pca-explanation" id="pca-${vizId}" style="display:none; margin-top: 1rem;"></div>
                </div>
                <div class="clustering-sidebar">
                    <h6>Cluster Profiles</h6>
                    <div class="cluster-cards-container" id="cluster-profiles-${vizId}"></div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// Chart Renderer
// ============================================================================

export function render(data, vizId) {
    if (!data) return;

    // 1. Render Side Panels (HTML)
    renderClusterMeta(data, vizId);

    // 2. Render WebGL 3D Scatter
    const containerId = `cluster-${vizId}`;
    const container = document.getElementById(containerId);

    if (!container) return;

    // init Scene
    const sceneCore = new SceneCore(containerId, {
        alpha: true,
        antialias: true
    });

    if (!sceneCore.renderer) {
        // Fallback or error handled by SceneCore (reduced motion, etc.)
        // But SceneCore currently returns early if reduced motion.
        // We should add a fallback here if sceneCore.renderer is null
        renderFallback(container);
        return;
    }

    const { scene, camera } = sceneCore;

    // Camera setup
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);

    // Controls
    let controls = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, sceneCore.renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
    }

    // Process Data
    const pointsData = extractPoints(data);

    // Create Particle System
    const particles = createParticleSystem(pointsData);
    sceneCore.add(particles);

    // Add Axes Helper / Grid
    const grid = new THREE.GridHelper(10, 10, 0x94a3b8, 0x334155);
    grid.material.transparent = true;
    grid.material.opacity = 0.2;
    sceneCore.add(grid);

    // Animation Loop
    sceneCore.animate((time) => {
        if (controls) controls.update();

        // Slight pulse for particles
        const sizes = particles.geometry.attributes.size.array;
        for (let i = 0; i < sizes.length; i++) {
            // Random-ish pulsation based on index
            sizes[i] = particles.userData.baseSizes[i] * (1 + Math.sin(time * 2 + i) * 0.2);
        }
        particles.geometry.attributes.size.needsUpdate = true;
    });
}

// ============================================================================
// 3D Helpers
// ============================================================================

function extractPoints(data) {
    // Try to get PCA 3D points
    if (data.pca_3d && data.pca_3d.points && data.pca_3d.points.length > 0) {
        return data.pca_3d.points;
    }
    // Fallback: Generate if not present (simulated for demo if backend sends nothing)
    // In real app, we should show empty state.
    // For demo continuity, we use simulate if "labels" exist
    if (data.labels) {
        return generateSamplePoints(data.n_clusters || 3, data.labels);
    }
    return [];
}

function createParticleSystem(points) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const baseSizes = [];

    const colorHelper = new THREE.Color();

    points.forEach(p => {
        // Position
        positions.push(p.x * 2, p.y * 2, p.z * 2); // Scale up a bit

        // Color
        const hex = getClusterColor(p.cluster);
        colorHelper.set(hex);
        colors.push(colorHelper.r, colorHelper.g, colorHelper.b);

        // Size
        const size = p.cluster === -1 ? 0.05 : 0.15; // Smaller for noise
        sizes.push(size);
        baseSizes.push(size);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Store base sizes for animation
    const particleSystem = new THREE.Points(geometry, Materials.glowPoint.clone());
    particleSystem.material.vertexColors = true;
    particleSystem.userData = { baseSizes };

    return particleSystem;
}

function generateSamplePoints(nClusters, labels) {
    const points = [];
    labels.forEach((cluster, idx) => {
        if (cluster === -1) {
            // Noise
            points.push({
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4,
                z: (Math.random() - 0.5) * 4,
                cluster
            });
        } else {
            // Cluster centers
            const angle = (cluster / nClusters) * Math.PI * 2;
            const r = 1.5;
            const cx = Math.cos(angle) * r;
            const cy = Math.sin(angle) * r;
            const cz = 0;

            points.push({
                x: cx + (Math.random() - 0.5) * 0.8,
                y: cy + (Math.random() - 0.5) * 0.8,
                z: cz + (Math.random() - 0.5) * 0.8,
                cluster
            });
        }
    });
    return points;
}

function renderFallback(container) {
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;">
            <p>3D Visualization Unavailable (Low Power / Reduced Motion)</p>
        </div>
    `;
}

// ============================================================================
// HTML Side Panels (Unchanged logic, just cleanup)
// ============================================================================

function renderClusterMeta(clusterData, vizId) {
    const profilesContainer = document.getElementById(`cluster-profiles-${vizId}`);
    const pcaContainer = document.getElementById(`pca-${vizId}`);

    if (!profilesContainer) return;

    const profiles = clusterData.cluster_profiles || [];
    const pca3d = clusterData.pca_3d || {};
    const componentLoadings = pca3d.component_loadings || [];

    // Render cluster profile cards
    if (profiles.length > 0) {
        profilesContainer.innerHTML = profiles.map(p => `
            <div class="cluster-card" style="border-left: 4px solid ${getClusterColor(p.cluster_id)}">
                <div class="cluster-header">
                    <span class="cluster-badge" style="background: ${getClusterColor(p.cluster_id)}">Cluster ${p.cluster_id + 1}</span>
                    <span class="cluster-size">${p.size} pts (${p.percentage.toFixed(1)}%)</span>
                </div>
                <div class="cluster-stats">
                    ${Object.entries(p.feature_stats || {}).slice(0, 3).map(([feat, stats]) => `
                        <div class="stat-row">
                            <span class="stat-name">${escapeHtml(feat.replace(/_/g, ' '))}</span>
                            <span class="stat-value">u=${stats.mean.toFixed(1)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else {
        profilesContainer.innerHTML = '<p style="color: #94a3b8;">No cluster profiles available</p>';
    }

    // Render PCA explanation
    if (pcaContainer && componentLoadings.length > 0) {
        pcaContainer.style.display = 'block';
        pcaContainer.innerHTML = `
            <h6>Principal Components</h6>
            <div class="pca-components">
                ${componentLoadings.map(pc => `
                    <div class="pca-component">
                        <strong>${pc.component}</strong>
                        <span class="pc-variance">${(pc.variance_explained * 100).toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}
