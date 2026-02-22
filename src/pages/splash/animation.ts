interface AnimationControls {
    cleanup: () => void;
    triggerWarp: () => number;
    stopWarp: (playEndEffect?: boolean) => void;
}

export type { AnimationControls };

export function setupAnimation(): AnimationControls {
    const canvas = document.getElementById('starcanvas') as HTMLCanvasElement;
    const horrorCanvas = document.getElementById('horrorcanvas') as HTMLCanvasElement;
    if (!canvas || !horrorCanvas) return { cleanup: () => { }, triggerWarp: () => 0, stopWarp: () => { } };

    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    const hctx = horrorCanvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx || !hctx) return { cleanup: () => { }, triggerWarp: () => 0, stopWarp: () => { } };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isNarrowViewport = window.matchMedia('(max-width: 900px)').matches;
    const renderScale = prefersReducedMotion ? 0.68 : isNarrowViewport ? 0.82 : 1;

    let viewportW = document.documentElement.clientWidth;
    let viewportH = document.documentElement.clientHeight;
    let w = Math.max(1, Math.floor(viewportW * renderScale));
    let h = Math.max(1, Math.floor(viewportH * renderScale));
    let cx = w / 2;
    let cy = h / 2;
    let maxDim = Math.max(w, h);
    let minDim = Math.min(w, h);

    canvas.width = w;
    canvas.height = h;
    horrorCanvas.width = w;
    horrorCanvas.height = h;

    // Initial fill
    ctx.fillStyle = '#170005'; // hsl(340, 64%, 4%) optimization
    ctx.fillRect(0, 0, w, h);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = w;
    offscreenCanvas.height = h;
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: false }) as CanvasRenderingContext2D;

    // --- Pre-rendered Assets & Gradients ---
    function makeStarSprite(hue: number, satPct: number, lightPct: number): HTMLCanvasElement {
        const c = document.createElement('canvas');
        c.width = 100; c.height = 100;
        const sCtx = c.getContext('2d')!;
        const half = 50;
        const g = sCtx.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0.02, 'rgba(255, 236, 184, 0.96)');
        g.addColorStop(0.12, `hsl(${hue}, ${satPct}%, ${lightPct}%)`);
        g.addColorStop(0.3, `hsl(${hue}, ${satPct + 3}%, ${Math.max(4, lightPct - 26)}%)`);
        g.addColorStop(1, 'transparent');
        sCtx.fillStyle = g;
        sCtx.beginPath();
        sCtx.arc(half, half, half, 0, Math.PI * 2);
        sCtx.fill();
        return c;
    }

    // Pre-render giant gradients to offscreen canvases to avoid generating them per-frame
    function createGradientCanvas(size: number, stops: [number, string][]): HTMLCanvasElement {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const cCtx = c.getContext('2d')!;
        const half = size / 2;
        const g = cCtx.createRadialGradient(half, half, 0, half, half, half);
        stops.forEach(s => g.addColorStop(s[0], s[1]));
        cCtx.fillStyle = g;
        cCtx.fillRect(0, 0, size, size);
        return c;
    }

    const gradPulse = createGradientCanvas(1024, [
        [0, 'rgba(0,0,0,0.98)'], [0.42, 'rgba(8,1,1,0.9)'], [0.7, 'rgba(24,5,3,0.56)'], [1, 'transparent']
    ]);
    const gradEye = createGradientCanvas(512, [
        [0, 'rgba(0,0,0,0)'], [0.46, 'rgba(0,0,0,0)'], [0.6, 'rgba(112, 16, 28, 0.34)'], [0.78, 'rgba(54, 8, 16, 0.16)'], [1, 'transparent']
    ]);
    const gradVig = createGradientCanvas(1024, [
        [0, 'transparent'], [0.72, 'rgba(4,0,2,0.012)'], [1, 'rgba(2,0,1,1)'] // Alpha modulated during draw
    ]);
    const gradIris = createGradientCanvas(512, [
        [0, '#000000'], [0.35, 'rgba(18,0,6,0.5)'], [1, 'transparent']
    ]);

    const sprites = {
        ember: makeStarSprite(10, 76, 46),
        emberDim: makeStarSprite(6, 62, 36),
        orange: makeStarSprite(24, 74, 44),
        gold: makeStarSprite(38, 88, 56),
        flare: makeStarSprite(48, 96, 62),
    };

    type StarType = 'ember' | 'emberDim' | 'orange' | 'gold' | 'flare';

    // Static color maps to avoid string concatenation in render loop
    const trailColors: Record<StarType, string> = {
        ember: '#761e18',
        emberDim: '#5c1a16',
        orange: '#8d4a18',
        gold: '#9e650f',
        flare: '#ba7f0a',
    };
    const warpTrailColors: Record<StarType, string> = {
        ember: '#6c1814',
        emberDim: '#6c1814',
        orange: '#7d3f10',
        gold: '#926011',
        flare: '#ad7410',
    };
    const alphaMods: Record<StarType, number> = {
        ember: 1,
        emberDim: 0.92,
        orange: 1,
        gold: 1.04,
        flare: 1.1,
    };

    function computeStarCount(width: number, height: number): number {
        const area = width * height;
        const density = prefersReducedMotion ? 0.00105 : isNarrowViewport ? 0.00122 : 0.00135;
        const target = Math.round(area * density);
        return Math.max(700, Math.min(2400, target));
    }

    const config = {
        starCount: 2200, depth: 900, fov: 360,
        baseSpeed: 0.2, rotationSpeed: 0.0026, warpSpeed: 44,
    };
    config.starCount = computeStarCount(w, h);

    // Cache rotation trigonometry
    let frameRotCos = Math.cos(config.rotationSpeed);
    let frameRotSin = Math.sin(config.rotationSpeed);

    let isWarping = false;
    let warpFactor = 0;
    let warpFrame = 0;
    const warpFrames = 56;
    const warpDurationMs = Math.round((warpFrames / 60) * 1000);
    let time = 0;
    let animationFrameId: number;

    let postWarpFrame = 0;
    const postWarpFrames = 72;
    let postWarpIntensity = 0;
    let postWarpJolt = 0;
    let postWarpBlinkAt = 0;
    let postWarpBlinkLen = 0;
    let voidRadius = 0;
    let voidFeather = minDim * 0.18;
    let voidStrength = 0;
    let voidTarget = 0;
    let voidHoldFrames = 0;
    let voidCooldown = 280 + Math.floor(Math.random() * 320);
    let voidPhase = Math.random() * Math.PI * 2;
    let isStopped = false;
    let isVisible = document.visibilityState === 'visible';
    let lastAnimationTs = performance.now();
    let resizeFrame: number | null = null;

    class StarObj {
        x: number; y: number; z: number;
        sizeBase: number; type: StarType;
        flickerPhase: number; flickerSpeed: number;
        driftX: number; driftY: number;
        alpha: number; prevX: number; prevY: number;
        hasPrev: boolean;

        constructor() {
            this.x = (Math.random() - 0.5) * w * 4;
            this.y = (Math.random() - 0.5) * h * 4;
            this.z = Math.pow(Math.random(), 1.35) * config.depth;
            const r = Math.random();
            this.type = r < 0.34
                ? 'ember'
                : r < 0.58
                    ? 'emberDim'
                    : r < 0.8
                        ? 'orange'
                        : r < 0.94
                            ? 'gold'
                            : 'flare';
            this.sizeBase = this.type === 'flare'
                ? Math.random() * 0.62 + 0.72
                : this.type === 'gold'
                    ? Math.random() * 0.54 + 0.64
                    : this.type === 'orange'
                        ? Math.random() * 0.55 + 0.6
                        : Math.random() * 0.46 + 0.45;
            this.flickerPhase = Math.random() * Math.PI * 2;
            this.flickerSpeed = 0.007 + Math.random() * 0.018;
            this.driftX = (Math.random() - 0.5) * 0.05;
            this.driftY = (Math.random() - 0.5) * 0.03;
            this.alpha = 0.6 + Math.random() * 0.35;
            this.prevX = 0; this.prevY = 0; this.hasPrev = false;
        }

        draw(ctxOff: CanvasRenderingContext2D, dt: number): void {
            this.flickerPhase += this.flickerSpeed * dt;
            const flicker = 0.82 + 0.18 * Math.sin(this.flickerPhase);
            this.x += this.driftX * dt;
            this.y += this.driftY * dt;

            if (isWarping) {
                this.z += config.warpSpeed * (1 + warpFactor * 2.8) * dt;
                this.x *= 0.92; this.y *= 0.92;
                if (this.z > config.depth) this.resetDist();
            } else {
                const nx = this.x * frameRotCos - this.y * frameRotSin;
                const ny = this.x * frameRotSin + this.y * frameRotCos;
                this.x = nx; this.y = ny;
                this.z -= config.baseSpeed * dt;
                if (this.z <= 0) this.resetDist();
            }

            const scale = config.fov / (config.fov + this.z);
            let x2d = cx + this.x * scale;
            let y2d = cy + this.y * scale;
            let size = Math.max(1.2, this.sizeBase * scale * 9);

            if (x2d < -120 || x2d > w + 120 || y2d < -120 || y2d > h + 120) {
                this.hasPrev = false;
                return;
            }

            let eatT = 0;
            if (voidStrength > 0.04) {
                const dxToVoid = cx - x2d;
                const dyToVoid = cy - y2d;
                const distToVoid = Math.hypot(dxToVoid, dyToVoid);
                const eatBand = Math.max(1, voidFeather);
                eatT = Math.max(0, Math.min(1, (voidRadius + eatBand - distToVoid) / eatBand));

                if (distToVoid < voidRadius * 0.58) {
                    this.resetDist();
                    this.hasPrev = false;
                    return;
                }

                if (eatT > 0) {
                    const pull = eatT * (0.32 + voidStrength * 0.24);
                    x2d += dxToVoid * pull;
                    y2d += dyToVoid * pull;
                    size *= 1 - eatT * 0.56;
                }
            }

            const finalAlphaBase = Math.max(0.14, Math.min(1, scale * 1.55) * this.alpha * flicker);
            const finalAlpha = finalAlphaBase * (1 - eatT * 0.92);

            if (this.hasPrev) {
                ctxOff.beginPath();
                ctxOff.moveTo(this.prevX, this.prevY);
                ctxOff.lineTo(x2d, y2d);

                if (!isWarping) {
                    ctxOff.globalAlpha = finalAlpha * 0.29 * alphaMods[this.type];
                    ctxOff.strokeStyle = trailColors[this.type];
                    ctxOff.lineWidth = Math.max(0.75, size * 0.56);
                } else {
                    ctxOff.globalAlpha = finalAlpha * (0.22 + warpFactor * 0.35);
                    ctxOff.strokeStyle = warpTrailColors[this.type];
                    ctxOff.lineWidth = Math.max(0.8, size * (0.62 + warpFactor * 0.34));
                }
                ctxOff.stroke();
            }

            ctxOff.globalAlpha = finalAlpha * (this.type === 'flare' ? 0.95 : this.type === 'emberDim' ? 0.82 : 0.88);
            ctxOff.drawImage(sprites[this.type], x2d - size / 2, y2d - size / 2, size, size);

            this.prevX = x2d; this.prevY = y2d; this.hasPrev = true;
        }

        resetDist() {
            this.z = Math.pow(Math.random(), 1.3) * config.depth;
            this.x = (Math.random() - 0.5) * w * 4;
            this.y = (Math.random() - 0.5) * h * 4;
            this.hasPrev = false;
        }
    }

    let stars: StarObj[] = Array.from({ length: config.starCount }, () => new StarObj());

    function syncViewportAndDensity(recreateStars: boolean): void {
        viewportW = document.documentElement.clientWidth;
        viewportH = document.documentElement.clientHeight;
        w = Math.max(1, Math.floor(viewportW * renderScale));
        h = Math.max(1, Math.floor(viewportH * renderScale));
        cx = w / 2;
        cy = h / 2;
        maxDim = Math.max(w, h);
        minDim = Math.min(w, h);

        canvas.width = w;
        canvas.height = h;
        horrorCanvas.width = w;
        horrorCanvas.height = h;
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;

        config.starCount = computeStarCount(w, h);
        voidFeather = minDim * 0.18;

        if (!recreateStars) return;
        stars = Array.from({ length: config.starCount }, () => new StarObj());
    }

    syncViewportAndDensity(true);

    // ---- Glitch state ----
    let glitchTimer = 200 + Math.floor(Math.random() * 400);
    let glitchActive = false;
    let glitchHoldFrames = 0;
    let glitchLines: { y: number; h: number; dx: number }[] = [];
    let glitchChromaticDx = 0;
    let glitchChromaticDy = 0;
    let dreadPulse = 0;

    function triggerGlitch() {
        glitchActive = true;
        glitchHoldFrames = 3 + Math.floor(Math.random() * 8);
        glitchChromaticDx = (Math.random() - 0.5) * 28;
        glitchChromaticDy = (Math.random() - 0.5) * 6;
        glitchLines = [{ y: Math.random() * h * 0.8, h: 14 + Math.random() * 55, dx: (Math.random() - 0.5) * 180 }];
        const count = 3 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            glitchLines.push({ y: Math.random() * h, h: 2 + Math.random() * 22, dx: (Math.random() - 0.5) * 130 });
        }
    }

    function startPostWarpHorror() {
        postWarpFrame = 0; postWarpIntensity = 1; postWarpJolt = 1;
        postWarpBlinkAt = 6 + Math.floor(Math.random() * 14);
        postWarpBlinkLen = 4 + Math.floor(Math.random() * 6);
        glitchActive = true; glitchHoldFrames = 12;
        glitchChromaticDx = (Math.random() - 0.5) * 40;
        glitchChromaticDy = (Math.random() - 0.5) * 11;
    }

    function drawPostWarpHorror() {
        if (postWarpIntensity <= 0) return;

        const intensity = postWarpIntensity;
        const phase = 1 - intensity;
        const t = time + postWarpFrame * 1.7;

        hctx.globalCompositeOperation = 'source-over';
        hctx.globalAlpha = 0.16 + intensity * 0.48;
        hctx.fillStyle = '#000000';
        hctx.fillRect(0, 0, w, h);

        const jx = Math.round(Math.sin(t * 0.41) * (2 + 8 * postWarpJolt) * intensity);
        const jy = Math.round(Math.cos(t * 0.33) * (1 + 5 * postWarpJolt) * intensity);

        hctx.globalAlpha = 0.06 + intensity * 0.14;
        hctx.drawImage(canvas, jx, jy);
        hctx.globalAlpha = 0.04 + intensity * 0.1;
        hctx.drawImage(canvas, -jx * 0.7, -jy * 0.7);

        // GPU Slicing instead of CPU getImageData
        hctx.globalAlpha = 1;
        const tearBands = (prefersReducedMotion ? 5 : 8) + Math.floor(intensity * (prefersReducedMotion ? 6 : 10));
        for (let i = 0; i < tearBands; i++) {
            const sy = Math.floor((i / tearBands) * h + Math.sin(t * 0.08 + i * 1.9) * 18);
            const sh = Math.max(2, Math.floor(2 + intensity * 14 + (i % 4) * 2));
            if (sy < 0 || sy + sh >= h || sh <= 0) continue;
            const dx = Math.round(Math.sin(t * 0.17 + i * 3.1) * (14 + intensity * 42));
            hctx.drawImage(canvas, 0, sy, w, sh, dx, sy, w, sh);
        }

        if (postWarpFrame >= postWarpBlinkAt && postWarpFrame <= postWarpBlinkAt + postWarpBlinkLen) {
            const faceAlpha = (0.18 + intensity * 0.44) * (1 - phase * 0.35);
            const eyeY = cy - h * 0.06;
            const eyeDX = w * 0.075;
            const eyeR = minDim * 0.05;

            hctx.globalAlpha = faceAlpha;
            hctx.drawImage(gradIris, cx - eyeDX - eyeR, eyeY - eyeR, eyeR * 2, eyeR * 2);
            hctx.drawImage(gradIris, cx + eyeDX - eyeR, eyeY - eyeR, eyeR * 2, eyeR * 2);

            hctx.globalAlpha = faceAlpha * 0.42;
            hctx.strokeStyle = '#580c14';
            hctx.lineWidth = 1.5;
            hctx.beginPath();
            hctx.moveTo(cx - eyeDX * 1.2, cy + h * 0.025);
            hctx.quadraticCurveTo(cx, cy + h * 0.12, cx + eyeDX * 1.2, cy + h * 0.025);
            hctx.stroke();
        }

        hctx.globalAlpha = 0.24 + intensity * 0.48;
        hctx.drawImage(gradVig, cx - maxDim, cy - maxDim, maxDim * 2, maxDim * 2);

        if (Math.random() < 0.06 + intensity * 0.18) {
            hctx.globalAlpha = 0.06 + intensity * 0.2;
            hctx.fillStyle = '#000000';
            hctx.fillRect(0, 0, w, h);
        }
        postWarpJolt *= Math.pow(0.92, frameDt);
    }

    // ---- Shadow monster silhouettes (Optimized with Path2D) ----
    class MonsterShape {
        anchorX: number; anchorY: number;
        breathPhase: number; breathSpeed: number;
        driftPhase: number; driftRadius: number;
        alpha: number; scale: number;
        pathOuter: Path2D; pathInner: Path2D; pathStroke: Path2D;

        constructor(ax: number, ay: number, seed: number) {
            this.anchorX = ax; this.anchorY = ay;
            this.breathPhase = Math.random() * Math.PI * 2;
            this.breathSpeed = 0.003 + Math.random() * 0.004;
            this.driftPhase = Math.random() * Math.PI * 2;
            this.driftRadius = 8 + Math.random() * 14;
            this.alpha = 0.095 + Math.random() * 0.05;
            this.scale = 0.3 + Math.random() * 0.17;

            const rng = (n: number) => (Math.sin(seed * 9301 + n * 49297 + 233995) * 0.5 + 0.5);
            const steps = 22 + Math.floor(rng(0) * 12);
            const pts: [number, number][] = [];
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const r = 0.28 + rng(i + 1) * 0.55 + 0.18 * Math.sin(rng(i + 2) * 8 + angle * (3 + Math.floor(rng(i + 3) * 5)));
                pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
            }

            this.pathOuter = new Path2D();
            this.pathInner = new Path2D();
            this.pathStroke = new Path2D();

            this.pathOuter.moveTo(pts[0][0] * 1.15, pts[0][1] * 1.15);
            this.pathInner.moveTo(pts[0][0], pts[0][1]);
            this.pathStroke.moveTo(pts[0][0], pts[0][1]);

            for (let i = 1; i < pts.length; i++) {
                this.pathOuter.lineTo(pts[i][0] * 1.15, pts[i][1] * 1.15);
                this.pathInner.lineTo(pts[i][0], pts[i][1]);
                this.pathStroke.lineTo(pts[i][0], pts[i][1]);
            }
            this.pathOuter.closePath();
            this.pathInner.closePath();
            this.pathStroke.closePath();
        }
    }

    const monsterAnchors: [number, number][] = [
        [-0.08, -0.08], [1.08, -0.08], [-0.08, 1.08], [1.08, 1.08],
        [0.5, -0.12], [0.5, 1.12], [-0.12, 0.5], [1.12, 0.5]
    ];
    const monsterSeeds = [1.337, 4.271, 7.918, 2.054, 8.621, 3.917, 6.284, 9.113];
    const monsters = monsterAnchors.map((a, i) => new MonsterShape(a[0], a[1], monsterSeeds[i]));

    function drawMonsters() {
        const monsterLimit = prefersReducedMotion ? 4 : monsters.length;
        for (let i = 0; i < monsterLimit; i++) {
            const m = monsters[i];
            m.breathPhase += m.breathSpeed * frameDt;
            m.driftPhase += 0.002 * frameDt;
            const breathe = 1.0 + 0.04 * Math.sin(m.breathPhase);
            const baseSize = minDim * m.scale * breathe;
            const ox = m.anchorX * w + Math.cos(m.driftPhase) * m.driftRadius;
            const oy = m.anchorY * h + Math.sin(m.driftPhase * 0.9) * m.driftRadius;

            hctx.save();
            hctx.translate(ox, oy);
            hctx.scale(baseSize, baseSize);

            hctx.globalAlpha = (m.alpha + dreadPulse * 0.04) * 0.95;
            hctx.fillStyle = '#0c0208';
            hctx.fill(m.pathOuter);

            hctx.globalAlpha = (m.alpha + dreadPulse * 0.06) * (0.88 + 0.12 * Math.sin(m.breathPhase * 0.7));
            hctx.fillStyle = '#1e0612';
            hctx.fill(m.pathInner);

            hctx.globalAlpha = (m.alpha + dreadPulse * 0.03) * 0.5;
            hctx.strokeStyle = '#481422';
            hctx.lineWidth = 1.2 / baseSize; // Reverse scale for constant stroke
            hctx.stroke(m.pathStroke);

            hctx.restore();
        }
    }

    // ---- Eye of the Void ----
    let eyePhase = 0; let eyeTimer = 600 + Math.random() * 900;
    let eyeOpen = 0; let eyeHoldTimer = 0;
    let frameDt = 1;

    function updateVoidState() {
        if (isWarping) {
            voidTarget = 0;
            voidHoldFrames = 0;
        } else if (voidTarget <= 0.01 && voidStrength <= 0.02) {
            if ((voidCooldown -= frameDt) <= 0) {
                voidTarget = 0.7 + Math.random() * 0.28;
                voidHoldFrames = 65 + Math.floor(Math.random() * 70);
                voidCooldown = 420 + Math.floor(Math.random() * 520);
            }
        } else if (voidTarget > 0 && (voidHoldFrames -= frameDt) <= 0) {
            voidTarget = 0;
        }

        const easing = voidTarget > voidStrength ? 0.07 : 0.03;
        voidStrength += (voidTarget - voidStrength) * easing * frameDt;
        voidPhase += 0.01 * frameDt;

        const hunger = Math.max(0, voidStrength + Math.sin(voidPhase) * 0.04);
        voidRadius = minDim * (0.12 + hunger * 0.25);
        voidFeather = minDim * (0.09 + hunger * 0.17);
    }

    function drawCenterPulse() {
        if (voidStrength < 0.03) {
            return;
        }

        const hunger = Math.max(0, voidStrength + Math.sin(voidPhase) * 0.05 + dreadPulse * 0.04);
        const radius = voidRadius;
        const feather = voidFeather;
        const wobbleX = Math.sin(time * 0.021) * (3 + hunger * 4);
        const wobbleY = Math.cos(time * 0.018) * (3 + hunger * 4);

        hctx.globalCompositeOperation = 'source-over';
        hctx.globalAlpha = 0.46 + hunger * 0.26;
        hctx.drawImage(gradPulse, cx - radius - feather + wobbleX, cy - radius - feather + wobbleY, (radius + feather) * 2, (radius + feather) * 2);
        hctx.globalAlpha = 0.82;
        hctx.fillStyle = '#020000';
        hctx.beginPath();
        hctx.arc(cx + wobbleX * 0.18, cy + wobbleY * 0.18, radius * 0.72, 0, Math.PI * 2);
        hctx.fill();

        hctx.globalAlpha = 0.18 + hunger * 0.16;
        hctx.strokeStyle = '#2a0a06';
        hctx.lineWidth = 1.2 + hunger * 2.2;
        hctx.beginPath();
        hctx.arc(cx + wobbleX * 0.35, cy + wobbleY * 0.35, radius * 0.94, 0, Math.PI * 2);
        hctx.stroke();

        hctx.globalCompositeOperation = 'source-over';
    }

    function tickEye() {
        if (isWarping && eyePhase > 0) eyePhase = 3;
        if (eyePhase === 0) {
            if ((eyeTimer -= frameDt) <= 0 && !isWarping) eyePhase = 1;
        } else if (eyePhase === 1) {
            eyeOpen = Math.min(1, eyeOpen + 0.005 * frameDt);
            if (eyeOpen >= 1) { eyePhase = 2; eyeHoldTimer = 180; }
        } else if (eyePhase === 2) {
            if ((eyeHoldTimer -= frameDt) <= 0) eyePhase = 3;
        } else {
            eyeOpen = Math.max(0, eyeOpen - 0.004 * frameDt);
            if (eyeOpen <= 0) { eyePhase = 0; eyeTimer = 700 + Math.random() * 1100; }
        }
        if (eyePhase === 0) return;

        const eyeR = minDim * 0.39 * eyeOpen * 1.62;
        hctx.globalAlpha = eyeOpen * 0.42;
        hctx.drawImage(gradEye, cx - eyeR, cy - eyeR, eyeR * 2, eyeR * 2);

        hctx.globalAlpha = eyeOpen * 0.26;
        hctx.strokeStyle = '#681220';
        hctx.lineWidth = 2 + eyeOpen * 1.8;
        hctx.shadowColor = 'rgba(120, 18, 34, 0.35)';
        hctx.shadowBlur = 8 + eyeOpen * 9;
        hctx.beginPath();
        hctx.arc(cx, cy, eyeR * 0.9, 0, Math.PI * 2);
        hctx.stroke();
        hctx.shadowBlur = 0;
    }

    // ---- Main render loop ----
    function animate(ts: number) {
        if (isStopped) return;
        if (!isVisible) {
            animationFrameId = requestAnimationFrame(animate);
            return;
        }

        const elapsed = ts - lastAnimationTs;
        lastAnimationTs = ts;
        frameDt = Math.max(0.6, Math.min(2.4, elapsed / 16.666));
        time += frameDt;

        const rotation = config.rotationSpeed * frameDt;
        frameRotCos = Math.cos(rotation);
        frameRotSin = Math.sin(rotation);

        if (isWarping) {
            warpFrame = Math.min(warpFrame + frameDt, warpFrames);
            warpFactor = warpFrame / warpFrames;
        } else {
            warpFactor = 0;
        }

        if (postWarpIntensity > 0) {
            postWarpFrame = Math.min(postWarpFrame + frameDt, postWarpFrames);
            postWarpIntensity = Math.max(0, 1 - postWarpFrame / postWarpFrames);
        }

        if (!glitchActive) {
            if ((glitchTimer -= frameDt) <= 0) {
                triggerGlitch();
                glitchTimer = 200 + Math.floor(Math.random() * 400);
            }
        } else {
            if ((glitchHoldFrames -= frameDt) <= 0) glitchActive = false;
        }

        if (!isWarping && Math.random() < 0.0012 * frameDt) dreadPulse = 1;
        dreadPulse *= Math.pow(0.93, frameDt);
        updateVoidState();

        // ---- Star Layer ----
        offscreenCtx.globalAlpha = isWarping ? 0.06 : 0.082 + postWarpIntensity * 0.3;
        offscreenCtx.fillStyle = '#070608';
        offscreenCtx.fillRect(0, 0, w, h);

        for (let i = 0; i < stars.length; i++) stars[i].draw(offscreenCtx, frameDt);

        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#020102';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        ctx.drawImage(offscreenCanvas, 0, 0);

        // ---- Horror Overlays ----
        hctx.clearRect(0, 0, w, h);

        const breatheVig = 0.83 + 0.06 * Math.sin(time * 0.016);
        const vigOuter = h * breatheVig;
        hctx.globalAlpha = 0.07 + 0.02 * Math.sin(time * 0.01);
        hctx.drawImage(gradVig, cx - vigOuter, cy - vigOuter, vigOuter * 2, vigOuter * 2);

        drawCenterPulse();
        tickEye();
        drawMonsters();

        // GPU Glitch lines
        if (glitchActive && !isWarping) {
            for (const gl of glitchLines) {
                const sy = Math.floor(gl.y);
                const sh = Math.min(Math.floor(gl.h), h - sy);
                if (sh <= 0 || sy < 0 || sy + sh >= h) continue;
                hctx.drawImage(canvas, 0, sy, w, sh, Math.round(gl.dx), sy, w, sh);
            }
            hctx.globalAlpha = 0.035;
            hctx.drawImage(canvas, Math.round(glitchChromaticDx), Math.round(glitchChromaticDy));
            hctx.globalAlpha = 0.025;
            hctx.drawImage(canvas, Math.round(-glitchChromaticDx * 0.6), Math.round(-glitchChromaticDy * 0.6));

            hctx.globalAlpha = 1;
            const bands = prefersReducedMotion ? 1 : 2 + Math.floor(Math.random() * 4);
            hctx.fillStyle = '#000000';
            for (let b = 0; b < bands; b++) {
                hctx.globalAlpha = 0.3 + Math.random() * 0.25;
                hctx.fillRect(0, Math.random() * h, w, 1 + Math.random() * 5);
            }
        }

        // Warp effect
        if (isWarping) {
            const tf = warpFactor;

            hctx.save();
            hctx.translate(cx, cy);
            const zoom = 1 - tf * 0.16;
            hctx.scale(zoom, zoom);
            hctx.globalAlpha = 0.12 + tf * 0.28;
            hctx.drawImage(canvas, -cx, -cy, w, h);
            hctx.restore();

            hctx.globalAlpha = 0.09 + tf * 0.2;
            hctx.strokeStyle = '#5f0e10';
            hctx.lineWidth = 1.2 + tf * 1.5;
            hctx.beginPath();

            const outerMax = maxDim;
            const spokeCount = prefersReducedMotion ? 16 : 28;
            for (let i = 0; i < spokeCount; i++) {
                const angle = (i / spokeCount) * Math.PI * 2 + time * 0.008;
                const outerR = outerMax * (0.5 + (i % 5) * 0.06);
                const innerR = minDim * (0.04 + (1 - tf) * 0.22);
                const sx = cx + Math.cos(angle) * outerR;
                const sy = cy + Math.sin(angle) * outerR;
                const ex = cx + Math.cos(angle + 0.9) * innerR;
                const ey = cy + Math.sin(angle + 0.9) * innerR;
                const mx = (sx + ex) * 0.5 + Math.cos(angle + Math.PI / 2) * (18 + tf * 28);
                const my = (sy + ey) * 0.5 + Math.sin(angle + Math.PI / 2) * (18 + tf * 28);

                hctx.moveTo(sx, sy);
                hctx.quadraticCurveTo(mx, my, ex, ey);
            }
            hctx.stroke();

            const irisR = minDim * (0.07 + tf * 0.62) * 1.85;
            hctx.globalAlpha = 0.9 * tf;
            hctx.drawImage(gradIris, cx - irisR, cy - irisR, irisR * 2, irisR * 2);

            hctx.globalAlpha = 0.58 * tf;
            hctx.drawImage(gradVig, cx - maxDim, cy - maxDim, maxDim * 2, maxDim * 2);
        }

        drawPostWarpHorror();

        animationFrameId = requestAnimationFrame(animate);
    }

    function handleResize(): void {
        if (resizeFrame !== null) {
            cancelAnimationFrame(resizeFrame);
        }
        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;
            syncViewportAndDensity(true);
            lastAnimationTs = performance.now();
        });
    }

    function handleVisibilityChange(): void {
        isVisible = document.visibilityState === 'visible';
        if (isVisible) {
            lastAnimationTs = performance.now();
        }
    }

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(animate);

    return {
        cleanup: () => {
            isStopped = true;
            cancelAnimationFrame(animationFrameId);
            if (resizeFrame !== null) {
                cancelAnimationFrame(resizeFrame);
                resizeFrame = null;
            }
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        },
        triggerWarp: () => {
            if (isWarping) return 0;
            isWarping = true;
            warpFrame = 0;
            postWarpIntensity = 0;
            return warpDurationMs;
        },
        stopWarp: (playEndEffect = true) => {
            const wasWarping = isWarping;
            isWarping = false;
            if (playEndEffect && wasWarping) startPostWarpHorror();
        },
    };
}
