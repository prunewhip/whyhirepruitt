/**
 * perf.js
 * FPS Monitor and GPU Tiering
 */

export class PerfMonitor {
    constructor() {
        this.fps = 60;
        this.frames = 0;
        this.lastTime = performance.now();
        this.active = false;

        // Quality Tier: 3=High, 2=Medium, 1=Low (Reduced Motion/Mobile)
        this.tier = this.detectTier();
    }

    detectTier() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 1;

        // Simple heuristic: logical cores
        const cores = navigator.hardwareConcurrency || 4;
        if (cores >= 8) return 3;
        if (cores >= 4) return 2;
        return 1;
    }

    start() {
        this.active = true;
        this.loop();
    }

    loop() {
        if (!this.active) return;

        this.frames++;
        const now = performance.now();
        const delta = now - this.lastTime;

        if (delta >= 1000) {
            this.fps = Math.round((this.frames * 1000) / delta);
            // console.log(`[Perf] FPS: ${this.fps} | Tier: ${this.tier}`);

            // Dynamic Tweak
            if (this.fps < 30 && this.tier > 1) {
                console.warn('[Perf] Low FPS detected. Downgrading tier.');
                this.tier--;
            }

            this.frames = 0;
            this.lastTime = now;
        }

        requestAnimationFrame(() => this.loop());
    }

    getTier() {
        return this.tier;
    }
}

export const Perf = new PerfMonitor();
