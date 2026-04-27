// ============================================================
// main.js — Khởi tạo app, routing các màn hình
// ============================================================

window.BBMV = window.BBMV || {};

const installDiagnostics = () => {
  window.addEventListener('error', (e) => {
    console.error('[BBMV] Runtime error:', e.error || e.message || e);
    BBMV.utils.showCrashOverlay(e.message || String(e.error || 'Unknown runtime error'));
    BBMV.utils.showFallbackScreen('window.error');
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason?.message || String(e.reason || 'Unhandled promise rejection');
    console.error('[BBMV] Unhandled rejection:', e.reason || e);
    BBMV.utils.showCrashOverlay(reason);
    BBMV.utils.showFallbackScreen('unhandledrejection');
  });

  setInterval(() => {
    if (BBMV.utils._transitioning) return;
    try {
      BBMV.utils.ensureVisibleScreen();
    } catch (err) {
      console.error('[BBMV] Screen watchdog failed:', err);
    }
  }, 3000);
};

const installAudioUnlock = () => {
  const unlock = async () => {
    if (BBMV.audio.hasUserGesture?.()) return;
    BBMV.audio.markUserGesture?.();
    try {
      const ok = await BBMV.audio.resume();
      if (!ok) return;
      console.log('[BBMV] Audio unlocked by real user gesture.');
    } catch (err) {
      console.warn('[BBMV] Audio unlock failed:', err);
      return;
    }
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  };

  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('keydown', unlock, true);
};

const runStep = (name, fn, options = {}) => {
  const { fatal = false } = options;
  try {
    console.log(`[BBMV] Step: ${name}`);
    return fn();
  } catch (err) {
    console.error(`[BBMV] Step failed: ${name}`, err);
    if (fatal) throw err;
    BBMV.utils.showFallbackScreen(name);
    return null;
  }
};

const bootstrapDefaultProfileAndMenu = () => {
  try {
    const profile = BBMV.profile.ensureDefaultProfile();
    console.log('[BBMV] Default profile loaded');
    const shown = BBMV.utils.showScreen('menu');
    if (!shown) throw new Error('Unable to show screen-menu');
    console.log('[BBMV] Go directly to menu');
    const rendered = BBMV.profile.renderMenuScreen();
    if (!rendered) throw new Error('Unable to render menu screen');
    setTimeout(() => {
      BBMV.audio.speak(`Chào ${profile?.name || 'bé'}! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!`);
    }, 400);
  } catch (err) {
    console.error('[BBMV] bootstrapDefaultProfileAndMenu failed:', err);
    BBMV.utils.showFallbackScreen('default-profile-bootstrap');
  }
};

const initApp = () => {
  console.log('[BBMV] initApp start');
  installDiagnostics();
  installAudioUnlock();

  const bar = BBMV.utils.$('loading-bar');
  const txt = BBMV.utils.$('loading-text');

  const setProgress = (pct, msg) => {
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = msg;
  };

  BBMV.utils.showScreen('loading');
  setProgress(10, 'Đang tải font chữ...');

  runStep('audio.preloadVoices', () => BBMV.audio.preloadVoices());
  setProgress(30, 'Đang chuẩn bị âm thanh...');

  const s = runStep('settings.get', () => BBMV.settings.get()) || {};
  runStep('settings.apply', () => BBMV.settings.applySettings(s));
  setProgress(50, 'Đang tải cài đặt...');

  runStep('pwa.register', () => BBMV.pwa.register());
  setProgress(70, 'Đang khởi tạo game...');

  runStep('game.init', () => BBMV.game.init(), { fatal: true });
  setProgress(90, 'Đang khởi động...');

  runStep('bindAllEvents', () => bindAllEvents(), { fatal: true });
  setProgress(100, 'Sẵn sàng!');

  setTimeout(() => {
    bootstrapDefaultProfileAndMenu();
  }, 600);
};

const bindAllEvents = () => {
  BBMV.profile.bindEvents();
  BBMV.gamification.bindEvents();
  BBMV.camera.bindEvents();
  BBMV.report.bindEvents();
  BBMV.settings.bindEvents();
  BBMV.pwa.bindEvents();

  BBMV.utils.$('btn-play')?.addEventListener('pointerdown', () => {
    BBMV.audio.sfx.button();
    const profile = BBMV.profile.getCurrent() || BBMV.profile.ensureDefaultProfile();
    if (!profile) {
      BBMV.utils.showToast('Không thể khởi tạo hồ sơ mặc định!');
      return;
    }
    BBMV.utils.showScreen('patch');
    BBMV.camera.initScreen(profile);
  });

  document.addEventListener('visibilitychange', () => {
    const menuScreen = BBMV.utils.$('screen-menu');
    if (document.hidden) {
      BBMV.background.stopMenuCanvas();
    } else if (menuScreen?.classList.contains('active')) {
      BBMV.background.initMenuCanvas();
    }
  });

  const menuObs = new MutationObserver(() => {
    const menuScreen = BBMV.utils.$('screen-menu');
    if (menuScreen?.classList.contains('active')) BBMV.background.initMenuCanvas();
    else BBMV.background.stopMenuCanvas();
  });
  const menuScreen = BBMV.utils.$('screen-menu');
  if (menuScreen) menuObs.observe(menuScreen, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', BBMV.utils.debounce(() => {
    const gameScreen = BBMV.utils.$('screen-game');
    if (gameScreen?.classList.contains('active')) {
      const canvas = BBMV.utils.$('game-canvas');
      if (canvas) BBMV.utils.resizeCanvas(canvas);
    }
  }, 200));

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
