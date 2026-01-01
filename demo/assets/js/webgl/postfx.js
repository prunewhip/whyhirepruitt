/**
 * WebGL Post-Processing Effects
 * Bloom, depth-of-field, and other presets.
 * 
 * @module webgl/postfx
 */

// ============================================================================
// POST-PROCESSING PRESETS
// ============================================================================

/**
 * Bloom effect configuration presets.
 */
export const BLOOM_PRESETS = {
    subtle: {
        intensity: 0.3,
        threshold: 0.9,
        radius: 0.4
    },
    medium: {
        intensity: 0.6,
        threshold: 0.8,
        radius: 0.5
    },
    glow: {
        intensity: 1.0,
        threshold: 0.6,
        radius: 0.8
    }
};

/**
 * Depth-of-field configuration presets.
 */
export const DOF_PRESETS = {
    shallow: {
        focus: 10,
        aperture: 0.025,
        maxBlur: 0.01
    },
    portrait: {
        focus: 8,
        aperture: 0.015,
        maxBlur: 0.008
    },
    deep: {
        focus: 15,
        aperture: 0.005,
        maxBlur: 0.005
    }
};

// ============================================================================
// EFFECT COMPOSERS
// ============================================================================

/**
 * Create a simple bloom pass (requires EffectComposer).
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {Object} preset - Bloom preset configuration
 * @returns {Object|null} Effect composer or null if dependencies missing
 */
export function createBloomComposer(renderer, scene, camera, preset = BLOOM_PRESETS.subtle) {
    // Check for Three.js postprocessing
    if (typeof THREE.EffectComposer === 'undefined' ||
        typeof THREE.RenderPass === 'undefined' ||
        typeof THREE.UnrealBloomPass === 'undefined') {
        console.warn('[postfx] Post-processing classes not loaded. Add postprocessing bundle to enable bloom.');
        return null;
    }

    const { intensity, threshold, radius } = preset;
    const size = renderer.getSize(new THREE.Vector2());

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(size.x, size.y),
        intensity,
        radius,
        threshold
    );
    composer.addPass(bloomPass);

    return {
        composer,
        bloomPass,
        render: () => composer.render(),
        resize: (width, height) => {
            composer.setSize(width, height);
            bloomPass.resolution.set(width, height);
        }
    };
}

/**
 * Create simple depth-of-field effect using BokehPass.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {Object} preset - DOF preset configuration
 * @returns {Object|null} Effect controller or null if dependencies missing
 */
export function createDOFComposer(renderer, scene, camera, preset = DOF_PRESETS.shallow) {
    if (typeof THREE.EffectComposer === 'undefined' ||
        typeof THREE.BokehPass === 'undefined') {
        console.warn('[postfx] BokehPass not loaded. Add postprocessing bundle to enable DOF.');
        return null;
    }

    const { focus, aperture, maxBlur } = preset;
    const size = renderer.getSize(new THREE.Vector2());

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));

    const bokehPass = new THREE.BokehPass(scene, camera, {
        focus,
        aperture,
        maxblur: maxBlur,
        width: size.x,
        height: size.y
    });
    composer.addPass(bokehPass);

    return {
        composer,
        bokehPass,
        render: () => composer.render(),
        setFocus: (value) => { bokehPass.uniforms.focus.value = value; },
        resize: (width, height) => {
            composer.setSize(width, height);
        }
    };
}

// ============================================================================
// SIMPLE EFFECTS (no EffectComposer required)
// ============================================================================

/**
 * Apply CSS-based glow effect to canvas container.
 * @param {HTMLElement} container
 * @param {string} color - CSS color value
 * @param {number} intensity - 0 to 1
 */
export function applyCSSGlow(container, color = 'rgba(139, 92, 246, 0.3)', intensity = 0.5) {
    const blur = Math.round(20 * intensity);
    container.style.filter = `drop-shadow(0 0 ${blur}px ${color})`;
}

/**
 * Remove CSS glow effect.
 * @param {HTMLElement} container
 */
export function removeCSSGlow(container) {
    container.style.filter = '';
}
