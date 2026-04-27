window.FFV_SLASH_EFFECT = (() => {
  const SLASH_TTL = 110;
  const MAX_POINTS = 10;
  const MAX_SEGMENT_DISTANCE = 120;
  const SPARK_TTL = 120;

  const points = [];
  const sparks = [];
  let didLog = false;

  function nowMs(now) {
    return typeof now === 'number' ? now : performance.now();
  }

  function trimPoints(now) {
    while (points.length && now - points[0].t > SLASH_TTL) points.shift();
    while (points.length > MAX_POINTS) points.shift();
  }

  function trimSparks(now) {
    while (sparks.length && now - sparks[0].t > SPARK_TTL) sparks.shift();
  }

  function addSlashPoint(x, y) {
    const t = performance.now();
    const last = points[points.length - 1];
    const gapFromPrev = !!last && Math.hypot(x - last.x, y - last.y) > MAX_SEGMENT_DISTANCE;

    points.push({ x, y, t, gapFromPrev });
    trimPoints(t);
  }

  function addSlashHit(x, y) {
    const t = performance.now();
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      sparks.push({
        x,
        y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        len: 8 + Math.random() * 10,
        t
      });
    }
    trimSparks(t);
  }

  function updateSlashEffect(now) {
    const t = nowMs(now);
    trimPoints(t);
    trimSparks(t);
  }

  function drawGlowSegment(ctx, p1, p2, life) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = Math.min(10, Math.max(0.4, 8 * life));
    ctx.strokeStyle = `rgba(80, 220, 255, ${0.18 * life})`;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBladePolygon(ctx, p1, p2, width, startColor, endColor) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return;

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    const head = Math.min(len * 0.35, width * 1.8);
    const tailHalf = width * 0.2;
    const bodyHalf = width * 0.5;

    const tailX = p1.x - ux * head * 0.35;
    const tailY = p1.y - uy * head * 0.35;
    const tipX = p2.x + ux * head;
    const tipY = p2.y + uy * head;

    const grad = ctx.createLinearGradient(tailX, tailY, tipX, tipY);
    grad.addColorStop(0, startColor);
    grad.addColorStop(0.65, endColor);
    grad.addColorStop(1, startColor);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(p1.x + nx * tailHalf, p1.y + ny * tailHalf);
    ctx.lineTo(p2.x + nx * bodyHalf, p2.y + ny * bodyHalf);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(p2.x - nx * bodyHalf, p2.y - ny * bodyHalf);
    ctx.lineTo(p1.x - nx * tailHalf, p1.y - ny * tailHalf);
    ctx.closePath();
    ctx.fill();
  }

  function drawSlashEffect(ctx, now) {
    const t = nowMs(now);
    if (!didLog) {
      console.log('[SlashEffect] blade renderer active v5');
      didLog = true;
    }

    updateSlashEffect(t);

    for (let i = 1; i < points.length; i += 1) {
      const p1 = points[i - 1];
      const p2 = points[i];
      if (p2.gapFromPrev) continue;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > MAX_SEGMENT_DISTANCE) continue;

      const age = t - p2.t;
      const baseLife = 1 - age / SLASH_TTL;
      if (baseLife <= 0) continue;
      const segmentIndexFactor = i / points.length;
      const life = Math.max(0, baseLife * (1 - segmentIndexFactor * 0.15));
      if (life <= 0) continue;

      drawGlowSegment(ctx, p1, p2, life);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawBladePolygon(
        ctx,
        p1,
        p2,
        2.2 * life + 0.8,
        `rgba(255, 255, 255, ${0.18 * life})`,
        `rgba(255, 255, 255, ${0.9 * life})`
      );
      drawBladePolygon(
        ctx,
        p1,
        p2,
        1,
        `rgba(170, 240, 255, ${0.35 * life})`,
        `rgba(180, 245, 255, ${0.8 * life})`
      );
      ctx.restore();
    }

    if (!sparks.length) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    for (const spark of sparks) {
      const age = t - spark.t;
      const life = 1 - age / SPARK_TTL;
      if (life <= 0) continue;
      const len = spark.len * life;
      ctx.strokeStyle = `rgba(175, 245, 255, ${0.7 * life})`;
      ctx.lineWidth = 0.8 + life;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x + spark.dx * len, spark.y + spark.dy * len);
      ctx.stroke();
    }

    ctx.restore();
  }

  function clearSlashEffect() {
    points.length = 0;
    sparks.length = 0;
  }

  return {
    addSlashPoint,
    addSlashHit,
    updateSlashEffect,
    drawSlashEffect,
    clearSlashEffect
  };
})();
