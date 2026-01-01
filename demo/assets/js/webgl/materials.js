/**
 * materials.js
 * Shared Material System for the "Premium Ethereal" Look
 */

export const Materials = {
    // Laser Blue Glass
    glassPrimary: new THREE.MeshPhysicalMaterial({
        color: 0x2B7FD4, // Laser Blue
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.8, // Glass-like
        thickness: 0.5,
        envMapIntensity: 1.0,
        transparent: true,
        opacity: 0.9
    }),

    // Frosted White / Cream
    frostedCream: new THREE.MeshPhysicalMaterial({
        color: 0xF8FAFC,
        metalness: 0.0,
        roughness: 0.4,
        transmission: 0.4,
        transparent: true,
        opacity: 0.8
    }),

    // Glowing Particles (Basic)
    glowPoint: new THREE.PointsMaterial({
        color: 0x2B7FD4,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }),

    // Wireframe Accent
    wireframeSecondary: new THREE.LineBasicMaterial({
        color: 0x9199BE, // Cool Lavender
        transparent: true,
        opacity: 0.3
    }),

    // Standard Grid Helper Material
    gridLine: new THREE.LineBasicMaterial({
        color: 0xE2E8F0,
        transparent: true,
        opacity: 0.2
    })
};
