// ============================================================
// background.js — Vẽ nền động: mây, hoa, cỏ, nhân vật nền
// ============================================================

BBMV.background = (() => {
  // Phần tử nền
  let clouds = [];
  let flowers = [];
  let birds = [];
  let particles = []; // Hoa & sao khi bắt bướm
  let menuCtx = null;
  let menuRaf = null;
  let menuW = 0, menuH = 0, menuDpr = 1;

  // ── Khởi tạo các phần tử nền ──
  const initElements = (w, h) => {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.35,
        size: 40 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.7 + Math.random() * 0.3
      });
    }
    flowers = [];
    for (let i = 0; i < 12; i++) {
      flowers.push({
        x: (i / 12) * w + Math.random() * (w / 12),
        y: h * 0.78 + Math.random() * (h * 0.1),
        size: 8 + Math.random() * 10,
        color: ['#FF9EB5','#FFD6E0','#FFF3B0','#C5E8B0','#BDEAF5'][Math.floor(Math.random() * 5)],
        phase: Math.random() * Math.PI * 2,
        type: Math.floor(Math.random() * 3) // 0=tròn, 1=sao, 2=tim
      });
    }
    birds = [];
    for (let i = 0; i < 3; i++) {
      birds.push({
        x: Math.random() * w,
        y: h * 0.1 + Math.random() * h * 0.2,
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: 8 + Math.random() * 6
      });
    }
  };

  // ── Vẽ đám mây ──
  const drawCloud = (ctx, cx, cy, size, opacity) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'white';
    const puffs = [
      [0, 0, size * 0.5],
      [size * 0.4, -size * 0.1, size * 0.4],
      [-size * 0.4, size * 0.05, size * 0.35],
      [size * 0.8, size * 0.1, size * 0.3],
      [-size * 0.7, size * 0.15, size * 0.25]
    ];
    puffs.forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  // ── Vẽ hoa ──
  const drawFlower = (ctx, x, y, size, color, t, type) => {
    const sway = Math.sin(t * 0.8 + y * 0.01) * 2;
    ctx.save();
    ctx.translate(x + sway, y);
    // Thân
    ctx.strokeStyle = '#6BC95A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, size * 1.5);
    ctx.stroke();
    // Cánh hoa
    ctx.fillStyle = color;
    if (type === 0) { // Hoa tròn
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 1) { // Hoa nhọn
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.2, size * 0.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else { // Cúc
      ctx.fillStyle = '#FFF3B0';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, size * 0.15, size * 0.35, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Nhụy hoa
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // ── Vẽ chim nhỏ ──
  const drawBird = (ctx, x, y, size, t, phase) => {
    const wing = Math.sin(t * 4 + phase) * size * 0.5;
    ctx.save();
    ctx.strokeStyle = '#4A7A8A';
    ctx.lineWidth = size * 0.3;
    ctx.lineCap = 'round';
    // Cánh trái
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - size, y + wing, x - size * 2, y);
    ctx.stroke();
    // Cánh phải
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size, y + wing, x + size * 2, y);
    ctx.stroke();
    ctx.restore();
  };

  // ── Vẽ cầu vồng ──
  const drawRainbow = (ctx, w, h) => {
    const cx = w * 0.5, cy = h * 0.7;
    const colors = ['#FF9EB5','#FFD6E0','#FFF3B0','#C5E8B0','#BDEAF5','#D4B8FF'];
    colors.forEach((c, i) => {
      const r = w * 0.6 - i * 18;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = c;
      ctx.lineWidth = 14;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  };

  // ── Vẽ gấu teddy ──
  const drawTeddy = (ctx, x, y, size) => {
    const c = '#C8A87A';
    ctx.save();
    ctx.translate(x, y);
    // Tai
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(-size * 0.55, -size * 0.7, size * 0.28, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.55, -size * 0.7, size * 0.28, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#E8C8A0';
    ctx.beginPath(); ctx.arc(-size * 0.55, -size * 0.7, size * 0.16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.55, -size * 0.7, size * 0.16, 0, Math.PI*2); ctx.fill();
    // Đầu
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -size * 0.4, size * 0.5, 0, Math.PI*2); ctx.fill();
    // Mặt
    ctx.fillStyle = '#E8C8A0';
    ctx.beginPath(); ctx.ellipse(0, -size * 0.22, size * 0.25, size * 0.18, 0, 0, Math.PI*2); ctx.fill();
    // Mắt
    ctx.fillStyle = '#2D4A5A';
    ctx.beginPath(); ctx.arc(-size * 0.18, -size * 0.44, size * 0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * 0.18, -size * 0.44, size * 0.06, 0, Math.PI*2); ctx.fill();
    // Mũi
    ctx.fillStyle = '#FF9EB5';
    ctx.beginPath(); ctx.arc(0, -size * 0.32, size * 0.07, 0, Math.PI*2); ctx.fill();
    // Miệng cười
    ctx.strokeStyle = '#2D4A5A'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -size * 0.26, size * 0.12, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Thân
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, size * 0.25, size * 0.4, size * 0.42, 0, 0, Math.PI*2); ctx.fill();
    // Bụng
    ctx.fillStyle = '#E8C8A0';
    ctx.beginPath(); ctx.ellipse(0, size * 0.2, size * 0.25, size * 0.22, 0, 0, Math.PI*2); ctx.fill();
    // Tay
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-size * 0.52, size * 0.1, size * 0.15, size * 0.32, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.52, size * 0.1, size * 0.15, size * 0.32, 0.3, 0, Math.PI*2); ctx.fill();
    // Chân
    ctx.beginPath(); ctx.ellipse(-size * 0.22, size * 0.62, size * 0.16, size * 0.22, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.22, size * 0.62, size * 0.16, size * 0.22, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  };

  // ── Vẽ thỏ nhỏ ──
  const drawBunny = (ctx, x, y, size) => {
    ctx.save();
    ctx.translate(x, y);
    const c = '#F5F5F5';
    // Tai
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(-size*0.28, -size*0.9, size*0.13, size*0.4, -0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size*0.28, -size*0.9, size*0.13, size*0.4, 0.15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFD6E0';
    ctx.beginPath(); ctx.ellipse(-size*0.28, -size*0.9, size*0.07, size*0.3, -0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size*0.28, -size*0.9, size*0.07, size*0.3, 0.15, 0, Math.PI*2); ctx.fill();
    // Đầu
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -size*0.45, size*0.38, 0, Math.PI*2); ctx.fill();
    // Mắt
    ctx.fillStyle = '#FF9EB5';
    ctx.beginPath(); ctx.arc(-size*0.14, -size*0.5, size*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.14, -size*0.5, size*0.07, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-size*0.11, -size*0.52, size*0.03, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.11+size*0.03, -size*0.52, size*0.03, 0, Math.PI*2); ctx.fill();
    // Mũi + miệng
    ctx.fillStyle = '#FFB3C6';
    ctx.beginPath(); ctx.arc(0, -size*0.38, size*0.05, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FFB3C6'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -size*0.32, size*0.09, 0.2, Math.PI-0.2); ctx.stroke();
    // Thân
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, size*0.15, size*0.3, size*0.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  };

  // ── Vẽ toàn bộ scene nền ──
  const draw = (ctx, w, h, t, dpr) => {
    const W = w * dpr, H = h * dpr;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Bầu trời gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#C8EEFF');
    sky.addColorStop(0.5, '#BDEAF5');
    sky.addColorStop(1, '#DFF5E0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Cầu vồng
    drawRainbow(ctx, w, h);

    // Mây
    clouds.forEach(c => {
      c.x += c.speed * 0.3;
      if (c.x - c.size * 1.5 > w) c.x = -c.size * 1.5;
      drawCloud(ctx, c.x, c.y, c.size, c.opacity);
    });

    // Mặt trời
    const sunX = w * 0.88, sunY = h * 0.1;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 36);
    sunGrad.addColorStop(0, '#FFF5A0');
    sunGrad.addColorStop(0.6, '#FFE066');
    sunGrad.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 36, 0, Math.PI*2); ctx.fill();
    // Tia nắng
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = (i/8) * Math.PI*2 + t*0.3;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a)*38, sunY + Math.sin(a)*38);
      ctx.lineTo(sunX + Math.cos(a)*52, sunY + Math.sin(a)*52);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Chim
    birds.forEach(b => {
      b.x += b.speed * 0.4;
      if (b.x > w + 40) b.x = -40;
      drawBird(ctx, b.x, b.y, b.size, t, b.phase);
    });

    // Cỏ nền
    const grassGrad = ctx.createLinearGradient(0, h*0.72, 0, h);
    grassGrad.addColorStop(0, '#B5E0A0');
    grassGrad.addColorStop(1, '#8BC87A');
    ctx.fillStyle = grassGrad;
    ctx.beginPath();
    ctx.moveTo(0, h*0.75);
    // Đường viền cỏ gồ ghề
    for (let x = 0; x <= w; x += 15) {
      const bump = Math.sin(x * 0.05 + t * 0.5) * 8 + Math.sin(x * 0.12) * 4;
      ctx.lineTo(x, h * 0.74 + bump);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();

    // Hoa
    flowers.forEach(f => drawFlower(ctx, f.x, f.y, f.size, f.color, t, f.type));

    // Gấu teddy bên phải
    const teddySize = Math.min(w, h) * 0.09;
    drawTeddy(ctx, w * 0.88, h * 0.83, teddySize);

    // Thỏ bên trái
    const bunnySize = Math.min(w, h) * 0.08;
    drawBunny(ctx, w * 0.08, h * 0.87, bunnySize);

    ctx.restore();
  };

  // ── Particles (hoa/sao khi bắt bướm) ──
  const addParticles = (x, y, dpr) => {
    const colors = ['#FFD6E0','#FFF3B0','#BDEAF5','#C5E8B0','#FF9EB5','#FFE066'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spd = 3 + Math.random() * 4;
      particles.push({
        x: x / dpr, y: y / dpr,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? '⭐' : '🌸'
      });
    }
  };

  const updateDrawParticles = (ctx, dpr) => {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15; // gravidade
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.font = `${p.size * dpr}px serif`;
      ctx.fillText(p.type, p.x * dpr, p.y * dpr);
      ctx.restore();
    });
  };

  // ── Menu canvas animation ──
  const initMenuCanvas = () => {
    const canvas = BBMV.utils.$('menu-canvas');
    if (!canvas) return;
    let t = 0;
    let prevW = 0, prevH = 0;
    const animate = () => {
      const { w, h, dpr } = BBMV.utils.resizeCanvas(canvas);
      menuW = w; menuH = h; menuDpr = dpr;
      if (!menuCtx) {
        menuCtx = canvas.getContext('2d');
      }
      // Khởi tạo hoặc re-init khi đổi kích thước màn hình
      if (!clouds.length || Math.abs(w - prevW) > 20 || Math.abs(h - prevH) > 20) {
        initElements(w, h);
        prevW = w; prevH = h;
      }
      menuCtx.clearRect(0, 0, canvas.width, canvas.height);
      draw(menuCtx, w, h, t, dpr);
      t += 0.016;
      menuRaf = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(menuRaf);
    animate();
  };

  const stopMenuCanvas = () => {
    cancelAnimationFrame(menuRaf);
    menuCtx = null;
  };

  return { initElements, draw, addParticles, updateDrawParticles, initMenuCanvas, stopMenuCanvas };
})();
