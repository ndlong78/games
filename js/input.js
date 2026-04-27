window.FFV_INPUT = (() => {
  const TRAIL_MAX_POINTS = 18;
  const TRAIL_TTL_MS = 160;

  let enabled = false;
  const slashTrail = [];
  let currentPoint = null;

  function setup(canvas) {
    const onDown = (event) => {
      if (!enabled) return;
      const p = getPoint(event);
      slashTrail.length = 0;
      slashTrail.push(p);
      currentPoint = p;
      canvas.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event) => {
      if (!enabled || !currentPoint) return;
      const p = getPoint(event);
      slashTrail.push(p);
      trimExpiredPoints(p.t);
      while (slashTrail.length > TRAIL_MAX_POINTS) slashTrail.shift();
      currentPoint = p;
    };

    const onUp = () => {
      currentPoint = null;
    };

    canvas.addEventListener('pointerdown', onDown, { passive: true });
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerup', onUp, { passive: true });
    canvas.addEventListener('pointercancel', onUp, { passive: true });
  }

  function getPoint(event) {
    return { x: event.clientX, y: event.clientY, t: performance.now() };
  }

  function trimExpiredPoints(now = performance.now()) {
    while (slashTrail.length && now - slashTrail[0].t > TRAIL_TTL_MS) slashTrail.shift();
  }

  function getActiveTrail() {
    trimExpiredPoints();
    return slashTrail.slice();
  }

  function consumeTrail() {
    // Dùng trail đang còn hiệu lực để detection chém.
    return getActiveTrail();
  }

  function drawTrail(ctx) {
    const trail = getActiveTrail();
    if (trail.length < 2) return;
    drawSlashTrail(ctx, trail, performance.now());
  }

  function drawSlashTrail(ctx, slashTrail, now) {
    const activeTrail = slashTrail.filter((p) => (now - p.t) < TRAIL_TTL_MS);
    if (activeTrail.length < 2) return;

    for (let i = 1; i < activeTrail.length; i += 1) {
      const p1 = activeTrail[i - 1];
      const p2 = activeTrail[i];
      const age = now - p2.t;
      const life = 1 - (age / TRAIL_TTL_MS);
      if (life <= 0) continue;

      const widthGlow = 10 * life;
      const widthCore = Math.max(1.5, 3 * life);
      const alphaGlow = 0.35 * life;
      const alphaCore = 0.9 * life;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.strokeStyle = `rgba(120, 230, 255, ${alphaGlow})`;
      ctx.lineWidth = widthGlow;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.strokeStyle = `rgba(255, 255, 255, ${alphaCore})`;
      ctx.lineWidth = widthCore;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  return {
    setup,
    consumeTrail,
    setEnabled(v) {
      enabled = v;
      if (!v) {
        slashTrail.length = 0;
        currentPoint = null;
      }
    },
    drawTrail
  };
})();
