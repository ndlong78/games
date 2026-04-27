window.FFV_INPUT = (() => {
  const TRAIL_MAX_POINTS = 16;
  const TRAIL_TTL_MS = 200;

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

    const now = performance.now();
    const coreWidth = 20;
    const glowWidth = 34;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vệt sáng ngoài (xanh nhạt) cho cảm giác lưỡi dao phát quang.
    ctx.strokeStyle = 'rgba(140, 225, 255, 0.35)';
    ctx.lineWidth = glowWidth;
    ctx.beginPath();
    drawSmoothPath(ctx, trail);
    ctx.stroke();

    // Vệt lõi trắng xanh, dày ở đầu/gần giữa, mờ dần về đuôi theo thời gian điểm.
    for (let i = 1; i < trail.length; i += 1) {
      const a = trail[i - 1];
      const b = trail[i];
      const age = Math.min(TRAIL_TTL_MS, now - b.t);
      const fade = 1 - (age / TRAIL_TTL_MS);
      if (fade <= 0.02) continue;

      const progress = i / (trail.length - 1);
      const belly = Math.sin(progress * Math.PI); // lớn ở giữa
      const width = 5 + (coreWidth * 0.35) + (coreWidth * 0.65 * belly);

      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, `rgba(90, 210, 255, ${0.18 * fade})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.75 * fade})`);
      grad.addColorStop(1, `rgba(180, 240, 255, ${0.28 * fade})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2, b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSmoothPath(ctx, points) {
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
      return;
    }

    for (let i = 1; i < points.length - 1; i += 1) {
      const curr = points[i];
      const next = points[i + 1];
      const cx = (curr.x + next.x) * 0.5;
      const cy = (curr.y + next.y) * 0.5;
      ctx.quadraticCurveTo(curr.x, curr.y, cx, cy);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
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
