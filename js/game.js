// ============================================================
// game.js — Game loop chính, xử lý input, scoring
// ============================================================

BBMV.game = (() => {
  let canvas, ctx;
  let raf = null;
  let lastTime = 0;
  let gameState = 'idle'; // idle | playing | paused | complete

  // Trạng thái game
  let level = 1, wave = 1;
  let butterflies = [];
  let totalButterflyTarget = 5;
  let caughtCount = 0;
  let missedCount = 0;
  let sessionStars = 0;
  let sessionDuration = 0;
  let maxCombo = 0;
  let currentCombo = 0;
  let comboTimer = 0;
  let catchTimestamps = [];

  // Input tracking
  let pointerX = -999, pointerY = -999;
  let pointerDown = false;
  let holdStart = 0;
  let holdTargetId = null;
  let trackingFrames = 0;
  let totalFrames = 0;

  const LEVEL_CONFIG = [
    null,
    { butterflies: 1, speed: 1, holdMs: 2000, wavesTotal: 3 },
    { butterflies: 2, speed: 1.5, holdMs: 1800, wavesTotal: 3 },
    { butterflies: 3, speed: 2.2, holdMs: 1500, wavesTotal: 3 },
    { butterflies: 4, speed: 3.0, holdMs: 1200, wavesTotal: 3 }
  ];

  const init = () => {
    canvas = BBMV.utils.$('game-canvas');
    ctx = canvas.getContext('2d');
    bindInput();
    bindHUD();
  };

  const startGame = (lvl = 1, wv = 1, options = {}) => {
    const activeProfile = BBMV.profile.getCurrent();
    if (!activeProfile) {
      BBMV.utils.showFatalError?.('Không tìm thấy hồ sơ đang hoạt động. Vui lòng chọn hồ sơ lại.');
      return;
    }
    level = lvl; wave = wv;
    gameState = 'playing';
    caughtCount = 0; missedCount = 0;
    sessionStars = 0; sessionDuration = 0;
    maxCombo = 0; currentCombo = 0;
    trackingFrames = 0; totalFrames = 0;
    catchTimestamps = [];
    lastTime = 0;

    BBMV.game._lastEyeCoverConfirmed = !!options.eyeCoverConfirmed;
    BBMV.game._lastEyeCoverAIResult = options.eyeCoverAIResult || 'unknown';

    const { w: bgW, h: bgH } = BBMV.utils.resizeCanvas(canvas);
    BBMV.background.initElements(bgW, bgH);
    spawnWave();
    updateHUD();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);

    BBMV.audio.init();
    BBMV.audio.startMusic();
    BBMV.audio.speak('Theo bướm nào! Bắt nó đi con!', true);
  };

  const spawnWave = () => {
    butterflies = [];
    const cfg = LEVEL_CONFIG[level];
    BBMV.utils.resizeCanvas(canvas);
    const W = canvas.width, H = canvas.height;
    const profile = BBMV.profile.getCurrent();
    const earnedBadges = profile ? BBMV.gamification.getBadges(profile.id) : {};
    const unlockedSkins = Object.keys(earnedBadges).length;

    for (let i = 0; i < cfg.butterflies; i++) {
      const skinIdx = Math.floor(Math.random() * Math.min(unlockedSkins + 1, 3));
      butterflies.push(new BBMV.Butterfly(W, H, level, skinIdx));
    }
    totalButterflyTarget = cfg.butterflies * 2;
    updateHUD();
  };

  const loop = (ts) => {
    if (gameState !== 'playing') return;
    raf = requestAnimationFrame(loop);

    const dt = lastTime ? Math.min((ts - lastTime) / 1000, 0.05) : 0.016;
    lastTime = ts;
    sessionDuration += dt;
    totalFrames++;

    const { w, h, dpr } = BBMV.utils.resizeCanvas(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    BBMV.background.draw(ctx, w, h, sessionDuration, dpr);

    let anyClose = false;
    butterflies.forEach(b => {
      const wasAlive = b.alive;
      const wasExploding = b.exploding;
      b.update(dt);
      b.draw(ctx, dpr);

      if (!b.caught && !b.exploding) {
        const d = BBMV.utils.dist(pointerX, pointerY, b.x * dpr, b.y * dpr);
        if (d < b.baseSize * dpr * 1.5) anyClose = true;
      }

      if (wasAlive && !wasExploding && !b.alive && !b.caught) onMiss(b);
    });

    if (anyClose) trackingFrames++;
    BBMV.background.updateDrawParticles(ctx, dpr);
    updateCatch(dpr);

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) currentCombo = 0;
    }

    checkWaveProgress();
    updateHUD();

    const timerEl = BBMV.utils.$('hud-timer');
    if (timerEl) timerEl.textContent = `⏱ ${Math.floor(sessionDuration)}s`;
  };

  const updateCatch = (dpr) => {
    if (!pointerDown) { holdStart = 0; holdTargetId = null; return; }

    const cfg = LEVEL_CONFIG[level];
    const now = performance.now();

    butterflies.forEach(b => {
      if (b.caught || b.exploding || !b.alive) return;

      const bx = b.x * dpr, by = b.y * dpr;
      const d = BBMV.utils.dist(pointerX, pointerY, bx, by);
      const threshold = b.baseSize * dpr * 1.5;

      if (d < threshold) {
        if (holdTargetId === b || holdTargetId === null) {
          holdTargetId = b;
          if (!holdStart) holdStart = now;
          const held = now - holdStart;
          const caught = b.checkCatch(pointerX / dpr, pointerY / dpr, held, cfg.holdMs);
          if (caught) {
            onCatch(b, dpr);
            holdStart = 0; holdTargetId = null;
          }
        }
      } else if (holdTargetId === b) {
        holdStart = 0; holdTargetId = null;
        b.catchProgress = 0;
      }
    });
  };

  const onCatch = (b, dpr) => {
    caughtCount++;
    currentCombo++;
    comboTimer = 2.5;
    if (currentCombo > maxCombo) maxCombo = currentCombo;
    const now = performance.now();
    catchTimestamps.push(now);
    catchTimestamps = catchTimestamps.filter(t => now - t <= 10000);

    BBMV.background.addParticles(b.x * dpr, b.y * dpr, dpr);
    BBMV.audio.sfx.catch();

    const praises = ['Giỏi quá! Con theo dõi bướm rất đẹp!','Tuyệt vời!','Siêu giỏi!','Con giỏi quá!'];
    if (currentCombo >= 3) {
      showComboText(`🔥 Combo x${currentCombo}!`);
      BBMV.audio.speak(`Combo x${currentCombo}! Giỏi quá!`);
    } else {
      showComboText(praises[Math.floor(Math.random() * praises.length)]);
      if (Math.random() < 0.4) BBMV.audio.speak(praises[0]);
    }

    BBMV.audio.sfx.star();
    sessionStars++;
    updateHUD();

    setTimeout(() => {
      if (gameState !== 'playing') return;
      const { w, h, dpr: d } = BBMV.utils.resizeCanvas(canvas);
      const profile = BBMV.profile.getCurrent();
      const earnedBadges = profile ? BBMV.gamification.getBadges(profile.id) : {};
      const unlocked = Object.keys(earnedBadges).length;
      const newB = new BBMV.Butterfly(w * d, h * d, level, Math.floor(Math.random() * Math.min(unlocked + 1, 3)));
      butterflies = butterflies.filter(x => x !== b);
      butterflies.push(newB);
    }, 1000);
  };

  const onMiss = (b) => {
    if (gameState !== 'playing') return;
    missedCount++;
    currentCombo = 0;
    comboTimer = 0;
    BBMV.audio.sfx.miss();
    butterflies = butterflies.filter(x => x !== b);

    setTimeout(() => {
      if (gameState !== 'playing') return;
      const { w, h, dpr: d } = BBMV.utils.resizeCanvas(canvas);
      const profile = BBMV.profile.getCurrent();
      const earnedBadges = profile ? BBMV.gamification.getBadges(profile.id) : {};
      const unlocked = Object.keys(earnedBadges).length;
      const newB = new BBMV.Butterfly(w * d, h * d, level, Math.floor(Math.random() * Math.min(unlocked + 1, 3)));
      butterflies.push(newB);
    }, 350);
  };

  const showComboText = (text) => {
    const el = BBMV.utils.$('combo-text');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    requestAnimationFrame(() => {
      el.style.animation = '';
      el.classList.remove('hidden');
    });
    clearTimeout(BBMV._comboHideTimer);
    BBMV._comboHideTimer = setTimeout(() => el.classList.add('hidden'), 1600);
  };

  const checkWaveProgress = () => {
    if (caughtCount < totalButterflyTarget) return;
    cancelAnimationFrame(raf);
    gameState = 'complete';
    BBMV.audio.stopMusic();
    setTimeout(() => showComplete(), 300);
  };

  const showComplete = () => {
    const profile = BBMV.profile.getCurrent();
    const attempts = caughtCount + missedCount;
    const successRate = attempts > 0 ? (caughtCount / attempts) : 0;
    const trackAcc = totalFrames > 0 ? Math.round((trackingFrames / totalFrames) * 100) : 0;
    let stars = 1;
    if (successRate >= 0.9 && trackAcc >= 75) stars = 3;
    else if (successRate >= 0.7 && trackAcc >= 50) stars = 2;

    if (profile) {
      const session = {
        profileId: profile.id,
        date: BBMV.utils.now(),
        level,
        wave,
        stars,
        durationSeconds: Math.round(sessionDuration),
        butterfliesCaught: caughtCount,
        butterfliesMissed: missedCount,
        butterfliesTotal: attempts,
        trackingAccuracy: trackAcc,
        maxCombo,
        speedRecord: Math.max(0, catchTimestamps.length),
        eyeCoverConfirmed: BBMV.game._lastEyeCoverConfirmed || false,
        eyeCoverAIResult: BBMV.game._lastEyeCoverAIResult || 'unknown'
      };
      BBMV.report.saveSession(session);
      BBMV.gamification.updateStreak(profile.id);
      const stats = BBMV.gamification.calcStats(profile.id);
      const newBadges = BBMV.gamification.checkBadges(profile.id, stats);
      renderComplete(stars, caughtCount, attempts, trackAcc, Math.round(sessionDuration), newBadges, missedCount, successRate);
    }

    BBMV.audio.sfx.levelup();
    const msgs = ['Chúc mừng con!', 'Con giỏi lắm!', 'Tuyệt vời!'];
    BBMV.audio.speak(`${msgs[stars-1]} Màn này được ${stars} sao!`, true);
    BBMV.utils.showScreen('screen-complete');
  };

  const renderComplete = (stars, caught, total, acc, dur, newBadges, missed = 0, successRate = 0) => {
    const starsEl = BBMV.utils.$('complete-stars');
    if (starsEl) starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const titleEl = BBMV.utils.$('complete-title');
    const titles = ['Cố lên nhé! 💪', 'Giỏi lắm! 😊', 'Xuất sắc! 🎉'];
    if (titleEl) titleEl.textContent = titles[stars - 1];

    const statsEl = BBMV.utils.$('complete-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-row"><span class="stat-label">🦋 Bướm bắt được</span><span class="stat-value">${caught}/${total}</span></div>
        <div class="stat-row"><span class="stat-label">❌ Bướm bỏ lỡ</span><span class="stat-value">${missed}</span></div>
        <div class="stat-row"><span class="stat-label">✅ Tỷ lệ bắt</span><span class="stat-value">${Math.round(successRate * 100)}%</span></div>
        <div class="stat-row"><span class="stat-label">🎯 Độ chính xác</span><span class="stat-value">${acc}%</span></div>
        <div class="stat-row"><span class="stat-label">⏱ Thời gian</span><span class="stat-value">${BBMV.utils.formatTime(dur)}</span></div>
        <div class="stat-row"><span class="stat-label">🔥 Combo tối đa</span><span class="stat-value">x${maxCombo}</span></div>
        <div class="stat-row"><span class="stat-label">📊 Level</span><span class="stat-value">${level}</span></div>
      `;
    }

    BBMV.gamification.showNewBadge(newBadges);

    const btnNext = BBMV.utils.$('btn-next-level');
    if (btnNext) {
      const nextLevel = stars === 3 ? Math.min(level + 1, 4) : level;
      btnNext.onclick = () => {
        BBMV.audio.sfx.button();
        BBMV.utils.showScreen('screen-game');
        startGame(nextLevel, 1, { eyeCoverConfirmed: false, eyeCoverAIResult: 'unknown' });
      };
    }
  };

  const updateHUD = () => {
    const starsEl = BBMV.utils.$('hud-stars');
    const waveEl = BBMV.utils.$('hud-wave');
    const progressEl = BBMV.utils.$('hud-progress');
    if (starsEl) starsEl.textContent = `⭐ ${sessionStars}`;
    if (waveEl) waveEl.textContent = `Level ${level}`;
    if (progressEl) {
      const pct = totalButterflyTarget > 0 ? (caughtCount / totalButterflyTarget) * 100 : 0;
      progressEl.style.width = `${Math.min(pct, 100)}%`;
    }
  };

  const bindInput = () => {
    if (!canvas) return;
    const onMove = (e) => {
      e.preventDefault();
      const pos = BBMV.utils.getEventPos(e, canvas);
      pointerX = pos.x; pointerY = pos.y;
    };
    const onDown = (e) => {
      e.preventDefault();
      BBMV.audio.resume();
      const pos = BBMV.utils.getEventPos(e, canvas);
      pointerX = pos.x; pointerY = pos.y;
      pointerDown = true;
    };
    const onUp = (e) => {
      e.preventDefault();
      pointerDown = false;
      holdStart = 0;
      holdTargetId = null;
      butterflies.forEach(b => { b.catchProgress = 0; });
    };

    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    canvas.addEventListener('touchcancel', onUp, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
  };

  const bindHUD = () => {
    BBMV.utils.$('btn-pause')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      pauseGame();
    });
    BBMV.utils.$('btn-resume')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      resumeGame();
    });
    BBMV.utils.$('btn-restart')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.$('pause-overlay').classList.add('hidden');
      startGame(level, wave, { eyeCoverConfirmed: false, eyeCoverAIResult: 'unknown' });
    });
    BBMV.utils.$('btn-to-menu')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      stopGame();
      BBMV.utils.showScreen('screen-menu');
    });
    BBMV.utils.$('btn-replay')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.showScreen('screen-game');
      startGame(level, wave, { eyeCoverConfirmed: false, eyeCoverAIResult: 'unknown' });
    });
    BBMV.utils.$('btn-complete-menu')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      stopGame();
      BBMV.profile.renderMenuScreen();
      BBMV.utils.showScreen('screen-menu');
    });
  };

  const pauseGame = () => {
    gameState = 'paused';
    cancelAnimationFrame(raf);
    BBMV.audio.stopMusic();
    BBMV.utils.$('pause-overlay').classList.remove('hidden');
  };

  const resumeGame = () => {
    gameState = 'playing';
    BBMV.utils.$('pause-overlay').classList.add('hidden');
    lastTime = 0;
    BBMV.audio.startMusic();
    raf = requestAnimationFrame(loop);
  };

  const stopGame = () => {
    gameState = 'idle';
    cancelAnimationFrame(raf);
    BBMV.audio.stopMusic();
    BBMV.utils.$('pause-overlay')?.classList.add('hidden');
  };

  return { init, startGame, stopGame, pauseGame, resumeGame };
})();
