/**
 * nexus-main.js
 * Entry point for NexusAI Visualizations
 */

import { SceneCore } from '../webgl/scene-core.js';
import { Materials } from '../webgl/materials.js';
import { Perf } from '../webgl/perf.js';

class NexusMain {
    constructor() {
        this.initHero();
        Perf.start();
    }

    initHero() {
        const containerId = 'nexus-hero-canvas';
        if (!document.getElementById(containerId)) return;

        console.log('[Nexus] Initializing Hero Scene...');
        this.heroScene = new SceneCore(containerId, {
            alpha: true,
            antialias: true
        });

        // Add Nexus Core Visualization (Prototype: Rotating Geometric Knot)
        this.createNexusCore();
        this.setupLights();

        // Animation Loop
        this.heroScene.animate((time) => {
            if (this.coreMesh) {
                // Gentle rotation
                this.coreMesh.rotation.x = time * 0.1;
                this.coreMesh.rotation.y = time * 0.15;

                // Floating effect
                this.coreMesh.position.y = Math.sin(time * 0.5) * 0.2;
            }
        });
    }

    createNexusCore() {
        // Geometry: Torus Knot representing the complex data engine
        const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32);

        // Material: Premium Glass
        const material = Materials.glassPrimary;

        this.coreMesh = new THREE.Mesh(geometry, material);
        this.heroScene.add(this.coreMesh);

        // Add internal wireframe for "Tech" feel
        const wireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            Materials.wireframeSecondary
        );
        this.coreMesh.add(wireframe);
    }

    setupLights() {
        const scene = this.heroScene.scene;

        // Ambient Light (Soft base)
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        // Directional Light (Key light) - Laser Blue tint
        const dirLight = new THREE.DirectionalLight(0x2B7FD4, 2);
        dirLight.position.set(5, 5, 5);
        scene.add(dirLight);

        // Point Light (Fill) - Lavender
        const pointLight = new THREE.PointLight(0x9199BE, 1);
        pointLight.position.set(-5, -2, -5);
        scene.add(pointLight);
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nexusApp = new NexusMain();
});
