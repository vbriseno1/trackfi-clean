/**
 * Tiny canvas-based confetti burst — no library, no React, no styling deps.
 * Used when a savings goal is reached or a debt is paid off. Self-cleans the
 * canvas after the animation finishes, and silently no-ops if `document` /
 * `window` aren't available (SSR / tests).
 */
export function launchConfetti() {
  try {
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];
    const particles = Array.from({ length: 120 }, () => ({
      x: W * Math.random(),
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      w: Math.random() * 12 + 4,
      h: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 8,
      alpha: 1,
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.rot += p.rv;
        if (frame > 60) p.alpha -= 0.02;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < 120) requestAnimationFrame(draw);
      else document.body.removeChild(canvas);
    }
    draw();
  } catch {
    /* canvas / DOM not available — silent no-op */
  }
}
