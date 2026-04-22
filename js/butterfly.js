// ============================================================
// butterfly.js — Class Butterfly: vẽ, di chuyển Bezier, animation
// ============================================================

BBMV.Butterfly = class {
  constructor(canvasW, canvasH, level = 1, skinIndex = 0) {
    this.W = canvasW;
    this.H = canvasH;
    this.level = level;
    this.skinIndex = skinIndex;
    this.alive = true;
    this.caught = false;
    this.catchProgress = 0;   // 0→1 khi đang theo sát
    this.exploding = false;
    this.explodeT = 0;

    // Cấu hình theo level
    const speeds = [1.2, 1.8, 2.5, 3.3];
    this.speed = (speeds[level - 1] || 1.2) * (0.85 + Math.random() * 0.3);

    // Kích thước bướm (tính theo canvas px, có scale dpr)
    const settings = BBMV.utils.lsGet('bbmv_settings', {});
    const sizeMap = { small: 0.06, medium: 0.09, large: 0.12 };
    const sizeKey = settings.butterflySize || 'medium';
    this.baseSize = Math.min(canvasW, canvasH) * (sizeMap[sizeKey] || 0.09);

    // Màu sắc các loại bướm (unlock theo sao tích lũy)
    const SKINS = [
      { body: '#FFE066', wing1: '#FF9EB5', wing2: '#FFD6E0', outline: '#E87878' },   // Vàng-hồng
      { body: '#BDEAF5', wing1: '#5BC4E8', wing2: '#A8E0FF', outline: '#3A9FC0' },   // Xanh dương
      { body: '#C5E8B0', wing1: '#6BC95A', wing2: '#A8E890', outline: '#4A9A3A' },   // Xanh lá
      { body: '#FFD6E0', wing1: '#D4B8FF', wing2: '#EAD6FF', outline: '#8A60D0' },   // Tím
      { body: '#FFF3B0', wing1: '#FF9EB5', wing2: '#BDEAF5', outline: '#E87878',
        rainbow: true },  // Cầu vồng
      { body: '#FFFFFF', wing1: '#FFE066', wing2: '#FFF3B0', outline: '#FFB800',
        glow: true }      // Phát sáng
    ];
    this.skin = SKINS[skinIndex % SKINS.length];

    // Bezier path: tạo điểm ngẫu nhiên trên màn hình
    this._newPath();
    // Bắt đầu ở điểm P0
    this.x = this.p0.x;
    this.y = this.p0.y;

    // Animation cánh
    this.wingT = 0;
    this.wingSpeed = 4 + Math.random() * 3;

    // Trailing particles
    this.trail = [];
  }

  // Tạo đường bay Bezier mới
  _newPath() {
    const margin = this.baseSize * 2;
    const W = this.W, H = this.H;
    const rand = (a, b) => a + Math.random() * (b - a);

    // Giữ bướm trong vùng chơi (tránh HUD)
    const playH = H * 0.85;
    const topOff = H * 0.12;

    this.p0 = { x: rand(margin, W - margin), y: rand(topOff + margin, topOff + playH - margin) };
    this.p1 = { x: rand(margin, W - margin), y: rand(topOff + margin, topOff + playH - margin) };
    this.p2 = { x: rand(margin, W - margin), y: rand(topOff + margin, topOff + playH - margin) };
    this.p3 = { x: rand(margin, W - margin), y: rand(topOff + margin, topOff + playH - margin) };
    this.t = 0;
  }

  update(dt) {
    if (!this.alive) return;
    if (this.exploding) {
      this.explodeT += dt * 2;
      if (this.explodeT > 1) { this.alive = false; }
      return;
    }

    // Di chuyển theo Bezier
    this.t += dt * this.speed * 0.018;
    if (this.t >= 1) {
      this.p0 = { ...this.p3 };
      this._newPath();
      this.p0 = { ...this.p0 };
    }

    const pos = BBMV.utils.cubicBezier(this.p0, this.p1, this.p2, this.p3, Math.min(this.t, 1));
    this.x = pos.x;
    this.y = pos.y;

    // Wing animation
    this.wingT += dt * this.wingSpeed;

    // Trail
    this.trail.push({ x: this.x, y: this.y, life: 0.7 });
    if (this.trail.length > 8) this.trail.shift();
    this.trail.forEach(p => { p.life -= dt * 3; });
    this.trail = this.trail.filter(p => p.life > 0);
  }

  // Kiểm tra xem có đang bị theo sát không
  checkCatch(px, py, holdTime, requiredTime) {
    if (!this.alive || this.caught || this.exploding) return false;
    const d = BBMV.utils.dist(px, py, this.x, this.y);
    const threshold = this.baseSize * 1.5;
    if (d < threshold) {
      this.catchProgress = Math.min(1, holdTime / requiredTime);
      if (holdTime >= requiredTime) {
        this.triggerCatch();
        return true;
      }
    } else {
      this.catchProgress = 0;
    }
    return false;
  }

  triggerCatch() {
    this.caught = true;
    this.exploding = true;
    this.explodeT = 0;
  }

  draw(ctx, dpr) {
    if (!this.alive) return;

    const x = this.x * dpr;
    const y = this.y * dpr;
    const size = this.baseSize * dpr;

    ctx.save();

    // ── Glow effect (skin đặc biệt) ──
    if (this.skin.glow && !this.exploding) {
      ctx.shadowColor = '#FFE066';
      ctx.shadowBlur = 20 * dpr;
    }

    // ── Vẽ trail ──
    this.trail.forEach((p, i) => {
      const a = p.life * 0.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = this.skin.wing1;
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, size * 0.1 * (i / this.trail.length), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // ── Vẽ bướm ──
    if (this.exploding) {
      this._drawExplode(ctx, x, y, size);
    } else {
      const wingAngle = Math.sin(this.wingT) * 0.7;
      this._drawWings(ctx, x, y, size, wingAngle);
      this._drawBody(ctx, x, y, size);
      this._drawCatchIndicator(ctx, x, y, size);
    }

    ctx.restore();
  }

  _drawWings(ctx, x, y, size, angle) {
    const { wing1, wing2, outline } = this.skin;
    ctx.save();
    ctx.translate(x, y);

    // Cánh trái trên
    ctx.save();
    ctx.rotate(-angle);
    const grad1 = ctx.createRadialGradient(-size*0.1, -size*0.1, 0, -size*0.5, -size*0.5, size*0.8);
    if (this.skin.rainbow) {
      grad1.addColorStop(0, '#FFD6E0'); grad1.addColorStop(0.3, '#FFF3B0');
      grad1.addColorStop(0.6, '#C5E8B0'); grad1.addColorStop(1, '#BDEAF5');
    } else {
      grad1.addColorStop(0, wing2); grad1.addColorStop(1, wing1);
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size*0.2, -size*0.3, -size*0.9, -size*0.8, -size*0.6, -size*0.15);
    ctx.bezierCurveTo(-size*0.7, size*0.1, -size*0.1, size*0.05, 0, 0);
    ctx.fillStyle = grad1;
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5 * size / 40;
    ctx.stroke();
    ctx.restore();

    // Cánh phải trên
    ctx.save();
    ctx.scale(-1, 1);
    ctx.rotate(-angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size*0.2, -size*0.3, -size*0.9, -size*0.8, -size*0.6, -size*0.15);
    ctx.bezierCurveTo(-size*0.7, size*0.1, -size*0.1, size*0.05, 0, 0);
    ctx.fillStyle = grad1;
    ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5 * size / 40;
    ctx.stroke();
    ctx.restore();

    // Cánh trái dưới
    ctx.save();
    ctx.rotate(angle * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size*0.15, size*0.2, -size*0.7, size*0.6, -size*0.35, size*0.15);
    ctx.bezierCurveTo(-size*0.4, -size*0.05, -size*0.05, -size*0.05, 0, 0);
    const grad2 = ctx.createRadialGradient(-size*0.2, size*0.2, 0, -size*0.4, size*0.4, size*0.5);
    grad2.addColorStop(0, wing2); grad2.addColorStop(1, wing1);
    ctx.fillStyle = grad2; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5 * size / 40;
    ctx.stroke();
    ctx.restore();

    // Cánh phải dưới
    ctx.save();
    ctx.scale(-1, 1);
    ctx.rotate(angle * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size*0.15, size*0.2, -size*0.7, size*0.6, -size*0.35, size*0.15);
    ctx.bezierCurveTo(-size*0.4, -size*0.05, -size*0.05, -size*0.05, 0, 0);
    ctx.fillStyle = grad2; ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5 * size / 40;
    ctx.stroke();
    ctx.restore();

    // Hoa văn trên cánh
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.skin.outline;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-size*(0.2 + i*0.15), -size*(0.15 + i*0.12), size*0.06, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(size*(0.2 + i*0.15), -size*(0.15 + i*0.12), size*0.06, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  _drawBody(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    // Thân
    ctx.fillStyle = this.skin.body;
    ctx.strokeStyle = this.skin.outline;
    ctx.lineWidth = 1.5 * size / 40;
    ctx.beginPath();
    ctx.ellipse(0, 0, size*0.1, size*0.35, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    // Đầu
    ctx.beginPath();
    ctx.arc(0, -size*0.32, size*0.1, 0, Math.PI*2);
    ctx.fillStyle = this.skin.outline; ctx.fill();
    // Râu
    ctx.strokeStyle = this.skin.outline; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-size*0.05, -size*0.38);
    ctx.lineTo(-size*0.18, -size*0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size*0.05, -size*0.38);
    ctx.lineTo(size*0.18, -size*0.55);
    ctx.stroke();
    // Đầu râu
    ctx.fillStyle = this.skin.outline;
    ctx.beginPath(); ctx.arc(-size*0.19, -size*0.56, size*0.04, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(size*0.19, -size*0.56, size*0.04, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  _drawCatchIndicator(ctx, x, y, size) {
    if (this.catchProgress <= 0) return;
    ctx.save();
    // Vòng tròn tiến độ
    ctx.beginPath();
    ctx.arc(x, y, size * 0.9, -Math.PI/2, -Math.PI/2 + this.catchProgress * Math.PI * 2);
    ctx.strokeStyle = '#FFE066';
    ctx.lineWidth = 4 * (size / 40);
    ctx.lineCap = 'round';
    ctx.stroke();
    // Glow
    ctx.shadowColor = '#FFE066';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  _drawExplode(ctx, x, y, size) {
    const t = this.explodeT;
    const emojis = ['⭐','🌸','✨','🎊','🌟'];
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const a = (i/8) * Math.PI * 2;
      const d = t * size * 1.8;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d - t * size * 0.5;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.font = `${size * (0.5 + t * 0.3)}px serif`;
      ctx.fillText(emojis[i % emojis.length], px - size*0.3, py + size*0.3);
    }
    ctx.restore();
  }
};
