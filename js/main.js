// ============================================================
// main.js — Khởi tạo app, routing các màn hình
// ============================================================

window.BBMV = window.BBMV || {};

const installDiagnostics = () => {
  window.addEventListener('error', (e) => {
    console.error('[BBMV] Runtime error:', e.error || e.message || e);
    BBMV.utils.showCrashOverlay(e.message || String(e.error || 'Unknown runtime error'));
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason?.message || String(e.reason || 'Unhandled promise rejection');
    console.error('[BBMV] Unhandled rejection:', e.reason || e);
    BBMV.utils.showCrashOverlay(reason);
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
  let unlocked = false;

  const unlock = async () => {
    if (unlocked) return;
    try {
      const ok = await BBMV.audio.resume();
      if (!ok) return;
      unlocked = true;
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

const initApp = () => {
  installDiagnostics();
  installAudioUnlock();

  const bar = BBMV.utils.$('loading-bar');
  const txt = BBMV.utils.$('loading-text');

  const setProgress = (pct, msg) => {
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = msg;
  };

  BBMV.utils.showScreen('screen-loading');
  setProgress(10, 'Đang tải font chữ...');

  BBMV.audio.preloadVoices();
  setProgress(30, 'Đang chuẩn bị âm thanh...');

  const s = BBMV.settings.get();
  BBMV.settings.applySettings(s);
  setProgress(50, 'Đang tải cài đặt...');

  BBMV.pwa.register();
  setProgress(70, 'Đang khởi tạo game...');

  BBMV.game.init();
  setProgress(90, 'Đang khởi động...');

  bindAllEvents();
  setProgress(100, 'Sẵn sàng!');

  setTimeout(() => {
    try {
      BBMV.profile.renderProfilesScreen();
      const shown = BBMV.utils.showScreen('screen-profiles');
      if (!shown) throw new Error('Unable to show screen-profiles');

      const profiles = BBMV.profile.getAll();
      if (profiles.length > 0) {
        setTimeout(() => {
          // Chỉ đọc giọng nói, không khởi tạo AudioContext ở đây để tránh warning autoplay.
          BBMV.audio.speak('Chào con! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!');
        }, 500);
      }
    } catch (err) {
      console.error('[BBMV] Boot fallback failed, forcing profile screen:', err);
      BBMV.utils.showScreen('screen-profiles');
      BBMV.utils.showToast('Đã phục hồi giao diện. Nếu còn lỗi, vui lòng tải lại ứng dụng.');
    }
  }, 1200);
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
    const profile = BBMV.profile.getCurrent();
    if (!profile) {
      BBMV.utils.showToast('Vui lòng chọn hồ sơ trước!');
      return;
    }
    BBMV.utils.showScreen('screen-camera');
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
