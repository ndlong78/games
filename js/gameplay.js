window.FFV_GAME = (() => {
  const cfg = window.FFV_CONFIG;
  const state = {
    running: false,
    status: 'menu', // menu | playing | result
    score: 0,
    timeLeft: cfg.GAME.SESSION_SECONDS,
    elapsedSeconds: 0,
    elapsedMs: 0,
    remainingMs: cfg.GAME.SESSION_SECONDS * 1000,
    hearts: cfg.MAX_HEARTS,
    combo: 1,
    bestCombo: 1,
    difficultyStage: 1,
    accuracyHits: 0,
    accuracyAttempts: 0,
    missed: 0,
    startedAt: 0,
    finished: false
  };

  let canvas;
  let ctx;
  let fruits = [];
  let particles = [];
  let slashSparks = [];
  let fruitId = 1;
  let lastFrame = 0;
  let spawnCooldown = 0;
  let lastSliceMs = 0;
  let loopRef;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    window.FFV_INPUT.setup(canvas);
    window.addEventListener('resize', () => window.FFV_LAYOUT.resizeCanvas(canvas, ctx));
    window.FFV_LAYOUT.resizeCanvas(canvas, ctx);
  }

  function start() {
    state.running = true;
    state.status = 'playing';
    state.score = 0;
    state.timeLeft = cfg.GAME.SESSION_SECONDS;
    state.elapsedSeconds = 0;
    state.elapsedMs = 0;
    state.remainingMs = cfg.GAME.SESSION_SECONDS * 1000;
    state.hearts = cfg.MAX_HEARTS;
    state.combo = 1;
    state.bestCombo = 1;
    state.difficultyStage = 1;
    state.accuracyHits = 0;
    state.accuracyAttempts = 0;
    state.missed = 0;
    state.startedAt = performance.now();
    state.finished = false;
    fruits = [];
    particles = [];
    slashSparks = [];
    spawnCooldown = 0;
    lastSliceMs = 0;
    lastFrame = performance.now();
    window.FFV_INPUT.setEnabled(true);
    window.FFV_SCREENS.updateHUD(state);
    cancelAnimationFrame(loopRef);
    loopRef = requestAnimationFrame(loop);
  }

  function stop() {
    state.running = false;
    state.status = state.finished ? 'result' : 'menu';
    window.FFV_INPUT.setEnabled(false);
    cancelAnimationFrame(loopRef);
  }

  function loop(ts) {
    const dt = Math.min((ts - lastFrame) / 1000, 0.05);
    lastFrame = ts;
    update(dt, ts);
    render();

    if (state.running) loopRef = requestAnimationFrame(loop);
  }

  function update(dt, ts) {
    if (state.status !== 'playing') return;

    // Timer chỉ cộng khi game thực sự đang PLAYING.
    state.elapsedMs += dt * 1000;
    state.remainingMs = Math.max(0, cfg.GAME.SESSION_SECONDS * 1000 - state.elapsedMs);
    state.elapsedSeconds = state.elapsedMs / 1000;
    state.timeLeft = state.remainingMs / 1000;

    const stage = getDifficultyStage(state.elapsedSeconds);
    state.difficultyStage = stage.id;
    spawnCooldown -= dt;

    if (state.remainingMs <= 0) {
      window.FFV_SCREENS.updateHUD(state);
      finishGame('timeout');
      return;
    }

    if (spawnCooldown <= 0) {
      spawnWave(stage);
      spawnCooldown = Math.max(0.4, 1.2 - stage.speed * 0.16);
    }

    for (const item of fruits) {
      item.vy += 620 * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.rot += item.vx * 0.001;
      if (!item.sliced && item.y - item.r > window.FFV_LAYOUT.state.logicalHeight + 30) {
        item.dead = true;
        if (!item.forbidden) {
          // Tim chỉ mang tính động viên, không dùng để kết thúc game.
          state.hearts = Math.max(0, state.hearts - 1);
          state.missed += 1;
          state.combo = 1;
        }
      }
    }

    particles.forEach((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
    });
    slashSparks.forEach((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.9;
      spark.vy *= 0.9;
    });

    fruits = fruits.filter((f) => !f.dead);
    particles = particles.filter((p) => p.life > 0);
    slashSparks = slashSparks.filter((spark) => spark.life > 0);

    checkSlices(ts);

    window.FFV_SCREENS.updateHUD(state);
  }

  function getDifficultyStage(elapsedSec) {
    const roundedSec = Math.floor(elapsedSec);
    return cfg.DIFFICULTY_STAGES.find((item) => roundedSec >= item.startSecond && roundedSec <= item.endSecond) || cfg.DIFFICULTY_STAGES[cfg.DIFFICULTY_STAGES.length - 1];
  }

  function spawnWave(levelConfig) {
    const pad = window.FFV_LAYOUT.playAreaPadding();
    const w = window.FFV_LAYOUT.state.logicalWidth;
    const h = window.FFV_LAYOUT.state.logicalHeight;
    for (let i = 0; i < levelConfig.fruitsPerWave; i += 1) {
      const isForbidden = levelConfig.forbidden && Math.random() < 0.16;
      const base = isForbidden ? cfg.FORBIDDEN : cfg.FRUITS[Math.floor(Math.random() * cfg.FRUITS.length)];
      const r = Math.max(28, Math.min(50, w * 0.085 * levelConfig.radiusScale));
      const x = pad.left + 40 + Math.random() * (w - pad.left - pad.right - 80);
      const y = h + 50;
      const vx = (Math.random() * 220 - 110) * levelConfig.speed;
      const vy = -(650 + Math.random() * 220) * levelConfig.speed;
      fruits.push({ id: fruitId++, x, y, vx, vy, r, rot: 0, dead: false, sliced: false, ...base, forbidden: isForbidden });
    }
  }

  function checkSlices(ts) {
    const trail = window.FFV_INPUT.consumeTrail();
    if (trail.length < 2) return;

    for (let i = 1; i < trail.length; i += 1) {
      const a = trail[i - 1];
      const b = trail[i];
      for (const fruit of fruits) {
        if (fruit.dead || fruit.sliced) continue;
        const hit = segmentHitsCircle(a, b, fruit);
        if (hit.hit) {
          state.accuracyAttempts += 1;
          if (fruit.forbidden) {
            state.score = Math.max(0, state.score - 20);
            state.combo = 1;
            makeCutBurst(hit.x, hit.y, '#c7d2de');
          } else {
            slashFruit(fruit, ts, hit);
          }
        }
      }
    }
  }

  function slashFruit(fruit, ts, hitPoint) {
    fruit.sliced = true;
    fruit.dead = true;
    state.accuracyHits += 1;

    if (ts - lastSliceMs <= cfg.COMBO_WINDOW_MS) {
      state.combo += 1;
    } else {
      state.combo = 1;
    }
    lastSliceMs = ts;

    if (state.combo >= 5) {
      window.FFV_SCREENS.showCombo('🔥 Super Combo!');
    } else if (state.combo >= 3) {
      window.FFV_SCREENS.showCombo(`🔥 Combo x${state.combo}`);
    } else if (state.combo >= 2) {
      window.FFV_SCREENS.showCombo('✨ Combo x2');
    }

    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = Math.min(4, state.combo);
    state.score += fruit.score * multiplier;

    makeSplash(fruit.x, fruit.y, fruit.color);
    makeCutBurst(hitPoint.x, hitPoint.y, fruit.color);
    playCutSound();
  }

  function makeSplash(x, y, color) {
    for (let i = 0; i < 12; i += 1) {
      particles.push({
        x,
        y,
        vx: Math.random() * 280 - 140,
        vy: Math.random() * -220,
        life: 0.6 + Math.random() * 0.4,
        color
      });
    }
  }

  function makeCutBurst(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 120 + Math.random() * 160;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.18 + Math.random() * 0.22,
        color
      });
    }
    makeSlashSpark(x, y);
  }

  function makeSlashSpark(x, y) {
    const sparkCount = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      slashSparks.push({
        x,
        y,
        vx: Math.cos(angle) * (80 + Math.random() * 180),
        vy: Math.sin(angle) * (80 + Math.random() * 180),
        len: 8 + Math.random() * 6,
        life: 0.08 + Math.random() * 0.06
      });
    }
  }

  function playCutSound() {
    const audioCtx = window.FFV_AUDIO_CTX;
    if (!audioCtx || audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 520 + Math.random() * 300;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  }

  function render() {
    const w = window.FFV_LAYOUT.state.logicalWidth;
    const h = window.FFV_LAYOUT.state.logicalHeight;
    ctx.clearRect(0, 0, w, h);
    window.FFV_BACKGROUND.draw(ctx, w, h);

    for (const fruit of fruits) {
      ctx.save();
      ctx.translate(fruit.x, fruit.y);
      ctx.rotate(fruit.rot);
      ctx.font = `${fruit.r * 1.5}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, 0, 0);
      if (fruit.sliced) {
        ctx.globalAlpha = 0.5;
        ctx.fillText('✂️', 0, 0);
      }
      ctx.restore();
    }

    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (slashSparks.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'butt';
      for (const spark of slashSparks) {
        const alpha = Math.max(0, Math.min(1, spark.life / 0.14));
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(185, 245, 255, 0.95)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(
          spark.x - (spark.vx * 0.018) - Math.cos(Math.atan2(spark.vy, spark.vx)) * spark.len,
          spark.y - (spark.vy * 0.018) - Math.sin(Math.atan2(spark.vy, spark.vx)) * spark.len
        );
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    window.FFV_INPUT.drawTrail(ctx);
  }

  function finishGame(reason) {
    if (state.finished) return;
    state.finished = true;
    stop();
    const accuracy = state.accuracyAttempts === 0 ? 0 : Math.round((state.accuracyHits / state.accuracyAttempts) * 100);
    const result = {
      date: new Date().toISOString(),
      durationSeconds: cfg.GAME.SESSION_SECONDS,
      elapsedSeconds: Math.min(cfg.GAME.SESSION_SECONDS, Math.max(0, Math.round(state.elapsedSeconds))),
      score: state.score,
      fruitsSliced: state.accuracyHits,
      fruitsMissed: state.missed,
      heartsRemaining: Math.max(0, state.hearts),
      accuracy,
      maxCombo: state.bestCombo,
      finalDifficultyStage: state.difficultyStage,
      endedBy: reason
    };
    window.FFV_REPORT.save(result);
    window.FFV_SCREENS.showResult(result);
  }

  function stopByPlayer() {
    if (!state.running) return;
    finishGame('stopped');
  }

  function segmentHitsCircle(a, b, circle) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((circle.x - a.x) * abx + (circle.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const dx = cx - circle.x;
    const dy = cy - circle.y;
    const hit = (dx * dx + dy * dy) <= circle.r * circle.r;
    return { hit, x: cx, y: cy };
  }

  return { init, start, stop, stopByPlayer, state };
})();
