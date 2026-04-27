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
      window.FFV_SLASH_EFFECT.addSlashPoint(p.x, p.y);
      currentPoint = p;
      canvas.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event) => {
      if (!enabled || !currentPoint) return;
      const p = getPoint(event);
      slashTrail.push(p);
      trimExpiredPoints(p.t);
      while (slashTrail.length > TRAIL_MAX_POINTS) slashTrail.shift();
      window.FFV_SLASH_EFFECT.addSlashPoint(p.x, p.y);
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

  return {
    setup,
    consumeTrail,
    setEnabled(v) {
      enabled = v;
      if (!v) {
        slashTrail.length = 0;
        currentPoint = null;
        window.FFV_SLASH_EFFECT.clearSlashEffect();
      }
    }
  };
})();
