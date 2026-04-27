window.FFV_INPUT = (() => {
  let enabled = false;
  const trail = [];
  let currentPoint = null;

  function setup(canvas) {
    const onDown = (event) => {
      if (!enabled) return;
      const p = getPoint(event);
      trail.length = 0;
      trail.push(p);
      currentPoint = p;
      canvas.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event) => {
      if (!enabled || !currentPoint) return;
      const p = getPoint(event);
      trail.push(p);
      if (trail.length > 18) trail.shift();
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

  function consumeTrail() {
    return trail.slice();
  }

  return {
    setup,
    consumeTrail,
    setEnabled(v) { enabled = v; if (!v) trail.length = 0; },
    drawTrail(ctx) {
      if (trail.length < 2) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i += 1) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  };
})();
