/**
 * scene-core.js
 * Standardized WebGL Scene Manager for NexusAI
 */

export class SceneCore {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`[SceneCore] Container ${containerId} not found.`);
            return;
        }

        this.options = {
            antialias: true,
            alpha: true,
            ...options
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.rafId = null;
        this.clock = new THREE.Clock();
        this.disposables = [];

        // Check for reduced motion preference
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (this.prefersReducedMotion) {
            console.log('[SceneCore] Reduced motion enabled. Skipping WebGL init.');
            return;
        }

        this.init();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        // Fog for depth (Cream/White fade)
        this.scene.fog = new THREE.FogExp2(0xF1F5F9, 0.02);

        // Camera
        const { width, height } = this.getContainerDimensions();
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.options.antialias,
            alpha: this.options.alpha,
            powerPreference: 'high-performance'
        });

        // Pixel Ratio Cap (performance)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(width, height);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        // DOM Init
        this.container.appendChild(this.renderer.domElement);
        this.container.classList.add('scene-active');

        // Resize Listener
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);

        // Visibility Listener (Pause when tab hidden)
        this.onVisibilityChange = this.onVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    getContainerDimensions() {
        return {
            width: this.container.clientWidth,
            height: this.container.clientHeight
        };
    }

    onResize() {
        if (!this.camera || !this.renderer) return;

        const { width, height } = this.getContainerDimensions();

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    onVisibilityChange() {
        if (document.hidden) {
            this.stopPayload();
        } else {
            this.startPayload();
        }
    }

    animate(callback) {
        if (!this.renderer) return;

        const loop = () => {
            this.rafId = requestAnimationFrame(loop);
            const delta = this.clock.getDelta();
            const time = this.clock.getElapsedTime();

            if (callback) callback(time, delta);

            this.renderer.render(this.scene, this.camera);
        };

        this.startPayload = () => {
            if (!this.rafId) loop();
        };

        this.stopPayload = () => {
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
        };

        this.startPayload();
    }

    dispose() {
        this.stopPayload();
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);

        if (this.container && this.renderer) {
            this.container.removeChild(this.renderer.domElement);
        }

        // Dispose added objects
        this.disposables.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        if (this.renderer) this.renderer.dispose();
    }

    /**
     * Helper to add object and track for disposal
     */
    add(object) {
        if (this.scene) {
            this.scene.add(object);
            this.disposables.push(object);
        }
    }
}
