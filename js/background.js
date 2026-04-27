window.FFV_BACKGROUND = (() => {
  function draw(ctx, w, h) {
    const groundY = h * 0.78;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#9fe4ff');
    skyGrad.addColorStop(1, '#d8f7ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    drawCloud(ctx, w * 0.2, h * 0.18, 1.2);
    drawCloud(ctx, w * 0.7, h * 0.25, 1);

    ctx.fillStyle = '#78d26c';
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.font = `${Math.max(26, w * 0.07)}px serif`;
    ctx.fillText('🧺', w * 0.08, groundY - 18);
    ctx.fillText('🐻', w * 0.78, groundY - 18);
    ctx.fillText('🐰', w * 0.64, groundY - 22);
  }

  function drawCloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 25 * s, y - 8 * s, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  return { draw };
})();
