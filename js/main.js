// ============================================================
// main.js — Khởi tạo app, routing các màn hình
// ============================================================

window.BBMV = window.BBMV || {};

// ── Khởi động app ──
const initApp = () => {
  // Loading progress
  const bar = BBMV.utils.$('loading-bar');
  const txt = BBMV.utils.$('loading-text');
  let progress = 0;

  const setProgress = (pct, msg) => {
    progress = pct;
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = msg;
  };

  // Hiện loading screen
  BBMV.utils.showScreen('screen-loading');
  setProgress(10, 'Đang tải font chữ...');

  // Preload voices sớm
  BBMV.audio.preloadVoices();
  setProgress(30, 'Đang chuẩn bị âm thanh...');

  // Apply settings đã lưu
  const s = BBMV.settings.get();
  BBMV.settings.applySettings(s);
  setProgress(50, 'Đang tải cài đặt...');

  // Đăng ký Service Worker
  BBMV.pwa.register();
  setProgress(70, 'Đang khởi tạo game...');

  // Init game module
  BBMV.game.init();
  setProgress(90, 'Đang khởi động...');

  // Bind tất cả events
  bindAllEvents();
  setProgress(100, 'Sẵn sàng!');

  // Chuyển sang màn profile sau 1.2s
  setTimeout(() => {
    BBMV.profile.renderProfilesScreen();
    BBMV.utils.showScreen('screen-profiles');

    // Chào welcome nếu có profile
    const profiles = BBMV.profile.getAll();
    if (profiles.length > 0) {
      setTimeout(() => {
        BBMV.audio.init();
        BBMV.audio.speak('Chào con! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!');
      }, 500);
    }
  }, 1200);
};

// ── Bind tất cả sự kiện ──
const bindAllEvents = () => {
  // Profile
  BBMV.profile.bindEvents();

  // Gamification
  BBMV.gamification.bindEvents();

  // Camera
  BBMV.camera.bindEvents();

  // Report
  BBMV.report.bindEvents();

  // Settings
  BBMV.settings.bindEvents();

  // PWA
  BBMV.pwa.bindEvents();

  // Menu — Nút chơi
  BBMV.utils.$('btn-play')?.addEventListener('pointerdown', () => {
    BBMV.audio.resume();
    BBMV.audio.sfx.button();
    const profile = BBMV.profile.getCurrent();
    if (!profile) {
      BBMV.utils.showToast('Vui lòng chọn hồ sơ trước!');
      return;
    }
    // Kiểm tra camera
    BBMV.utils.showScreen('screen-camera');
    BBMV.camera.initScreen(profile);
  });

  // Menu canvas animation
  document.addEventListener('visibilitychange', () => {
    const menuScreen = BBMV.utils.$('screen-menu');
    if (document.hidden) {
      BBMV.background.stopMenuCanvas();
    } else if (menuScreen?.classList.contains('active')) {
      BBMV.background.initMenuCanvas();
    }
  });

  // Khi vào menu screen — start canvas
  const menuObs = new MutationObserver(() => {
    const menuScreen = BBMV.utils.$('screen-menu');
    if (menuScreen?.classList.contains('active')) {
      BBMV.background.initMenuCanvas();
    } else {
      BBMV.background.stopMenuCanvas();
    }
  });
  const menuScreen = BBMV.utils.$('screen-menu');
  if (menuScreen) menuObs.observe(menuScreen, { attributes: true, attributeFilter: ['class'] });

  // Xử lý resize (iPhone xoay màn hình)
  window.addEventListener('resize', BBMV.utils.debounce(() => {
    const gameScreen = BBMV.utils.$('screen-game');
    if (gameScreen?.classList.contains('active')) {
      const canvas = BBMV.utils.$('game-canvas');
      if (canvas) BBMV.utils.resizeCanvas(canvas);
    }
  }, 200));

  // Ngăn context menu trên mobile (long press)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Ngăn pinch-zoom trên iOS
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
};

// ── Chạy app khi DOM ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
