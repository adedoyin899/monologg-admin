import React, { useEffect, useRef } from "react";

export function WebGLHeroCanvas({ opacityMultiplier = 0.05 }: { opacityMultiplier?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;
    let hoverAlpha = 0;
    let scrollY = window.scrollY;

    const img = new Image();
    img.src = "/bg.svg";
    let pattern: CanvasPattern | null = null;

    const initPattern = () => {
      if (img.complete && img.naturalWidth > 0) {
        try {
          pattern = ctx.createPattern(img, "repeat");
        } catch {
          pattern = null;
        }
      }
    };

    img.onload = initPattern;
    initPattern();

    // Offscreen buffers for the hover shimmer: the reveal isn't one flat
    // circle of pattern at a uniform alpha — several soft "hotspots" drift
    // and pulse independently within the hover radius, each brightening the
    // pattern's own texture unevenly, so the reveal looks like shimmering
    // light rather than a spotlight. `mask` composites the hotspots together
    // (additive), then `shimmer` draws the pattern once and uses the mask to
    // modulate ITS alpha spatially (destination-in) before it's stamped onto
    // the main canvas — a plain radial gradient can't do this on its own
    // since it can only vary color/alpha smoothly from one center outward.
    const REVEAL_RADIUS = 340;
    const BUFFER_SIZE = REVEAL_RADIUS * 2;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = BUFFER_SIZE;
    maskCanvas.height = BUFFER_SIZE;
    const maskCtx = maskCanvas.getContext("2d");
    const shimmerCanvas = document.createElement("canvas");
    shimmerCanvas.width = BUFFER_SIZE;
    shimmerCanvas.height = BUFFER_SIZE;
    const shimmerCtx = shimmerCanvas.getContext("2d");

    // Fixed relative offsets/sizes, animated with independent phases/speeds
    // so the hotspots drift in and out of prominence rather than pulsing in
    // lockstep — that asynchrony is what reads as "shimmer" over a static gradient.
    const HOTSPOTS = [
      { dx: 0, dy: 0, r: 300, speed: 0.0009, phase: 0 },
      { dx: -120, dy: -70, r: 150, speed: 0.0014, phase: 1.3 },
      { dx: 130, dy: -50, r: 140, speed: 0.0011, phase: 2.8 },
      { dx: -70, dy: 120, r: 150, speed: 0.0017, phase: 4.1 },
      { dx: 90, dy: 110, r: 130, speed: 0.0013, phase: 5.5 },
    ];

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      initPattern();
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    const render = () => {
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      const isHovered = mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height;
      const targetAlpha = isHovered ? 1 : 0;
      hoverAlpha += (targetAlpha - hoverAlpha) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Dynamic scroll reactive ambient intensity — pulse amplitude and the
      // floor both scale with opacityMultiplier so a low value (subtle) stays
      // subtle instead of being swamped by a fixed-size pulse/floor tuned for
      // a much higher intensity.
      const scrollPulse = Math.sin(scrollY * 0.003) * 0.03 * (opacityMultiplier / 0.2);
      const baseAlpha = Math.max(0.01 * (opacityMultiplier / 0.2), opacityMultiplier * 0.3 + scrollPulse);

      if (pattern) {
        // 1. Ambient base bg.svg grid layer across the section
        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 2. Interactive mouse hover: a shimmering, non-uniform reveal of the
        // bg.svg grid — some patches brighter than others, drifting over time.
        if (hoverAlpha > 0.01 && maskCtx && shimmerCtx) {
          const maxAlpha = Math.min(0.85, hoverAlpha * opacityMultiplier * 2.6);
          const now = performance.now();

          // Build the shimmer mask: several soft radial hotspots combined
          // additively ("lighter"), each pulsing on its own phase/speed.
          maskCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
          maskCtx.globalCompositeOperation = "lighter";
          for (const h of HOTSPOTS) {
            const pulse = 0.5 + 0.5 * Math.sin(now * h.speed + h.phase);
            const hx = REVEAL_RADIUS + h.dx;
            const hy = REVEAL_RADIUS + h.dy;
            const g = maskCtx.createRadialGradient(hx, hy, 0, hx, hy, h.r);
            g.addColorStop(0, `rgba(255,255,255,${0.35 + 0.5 * pulse})`);
            g.addColorStop(1, "rgba(255,255,255,0)");
            maskCtx.fillStyle = g;
            maskCtx.fillRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
          }

          // Stamp the pattern into the shimmer buffer, world-aligned (so its
          // tiling lines up with the ambient base layer), then let the mask
          // modulate its alpha spatially.
          shimmerCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
          shimmerCtx.globalCompositeOperation = "source-over";
          shimmerCtx.globalAlpha = 1;
          shimmerCtx.save();
          shimmerCtx.translate(-(mouseX - REVEAL_RADIUS), -(mouseY - REVEAL_RADIUS));
          shimmerCtx.fillStyle = pattern;
          shimmerCtx.fillRect(mouseX - REVEAL_RADIUS, mouseY - REVEAL_RADIUS, BUFFER_SIZE, BUFFER_SIZE);
          shimmerCtx.restore();
          shimmerCtx.globalCompositeOperation = "destination-in";
          shimmerCtx.drawImage(maskCanvas, 0, 0);

          ctx.save();
          ctx.beginPath();
          ctx.arc(mouseX, mouseY, REVEAL_RADIUS, 0, Math.PI * 2);
          ctx.clip();
          ctx.globalAlpha = maxAlpha;
          ctx.drawImage(shimmerCanvas, mouseX - REVEAL_RADIUS, mouseY - REVEAL_RADIUS);
          ctx.restore();
        }
      } else {
        // Vector grid fallback if image loading
        if (hoverAlpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = hoverAlpha * opacityMultiplier;
          ctx.strokeStyle = "rgba(241, 48, 48, 0.25)";
          ctx.lineWidth = 1;
          const gridSize = 48;
          for (let x = 0; x <= width; x += gridSize) {
            if (Math.abs(mouseX - x) < 320) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
          }
          for (let y = 0; y <= height; y += gridSize) {
            if (Math.abs(mouseY - y) < 320) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
          }
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [opacityMultiplier]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
