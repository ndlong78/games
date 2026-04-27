(() => {
  const cfg = window.FFV_CONFIG;
  const $ = (id) => document.getElementById(id);
  let audioUnlocked = false;

  function init() {
    const canvas = $('game-canvas');
    window.FFV_GAME.init(canvas);
    bindEvents();
    initPWA();
    restoreLevel();
    window.FFV_SCREENS.show('screen-menu');
  }

  function bindEvents() {
    $('btn-start').addEventListener('click', () => startGame());
    $('btn-replay').addEventListener('click', () => startGame());
    $('btn-menu').addEventListener('click', () => window.FFV_SCREENS.show('screen-menu'));
    $('btn-stop').addEventListener('click', () => window.FFV_GAME.stopByPlayer());

    $('btn-parent').addEventListener('click', () => window.FFV_SCREENS.show('screen-parent'));
    $('btn-parent-back').addEventListener('click', () => window.FFV_SCREENS.show('screen-menu'));
    $('btn-unlock').addEventListener('click', unlockParent);
    $('btn-change-pin').addEventListener('click', changePin);
    $('btn-export-pdf').addEventListener('click', () => window.FFV_REPORT.exportPDF());

    document.addEventListener('pointerdown', unlockAudio, { passive: true });
  }

  function startGame() {
    unlockAudio();
    const banner = $('goal-banner');
    banner.classList.remove('hidden');
    banner.textContent = '🎮 Phiên chơi liên tục 2 phút bắt đầu!';
    setTimeout(() => banner.classList.add('hidden'), 1200);
    window.FFV_SCREENS.show('screen-game');
    window.FFV_GAME.start();
  }

  function unlockParent() {
    const pin = $('parent-pin').value.trim();
    if (pin !== window.FFV_REPORT.getPin()) {
      alert('Sai mã phụ huynh.');
      return;
    }
    $('parent-lock').classList.add('hidden');
    $('parent-report').classList.remove('hidden');
    window.FFV_REPORT.render($('report-list'));
  }

  function changePin() {
    const next = prompt('Nhập mã mới 4 số:');
    if (!/^\d{4}$/.test(next || '')) {
      alert('Mã phải gồm đúng 4 chữ số.');
      return;
    }
    window.FFV_REPORT.setPin(next);
    alert('Đã đổi mã phụ huynh.');
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    window.FFV_AUDIO_CTX = window.FFV_AUDIO_CTX || new Ctx();
    window.FFV_AUDIO_CTX.resume?.();
    audioUnlocked = true;
  }

  function initPWA() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

    const isDebug = new URLSearchParams(location.search).get('debug') === '1';
    const reset = $('btn-reset-cache');
    if (isDebug) {
      reset.classList.remove('hidden');
      reset.addEventListener('click', async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        localStorage.clear();
        alert('Đã reset cache + localStorage');
      });
    }
  }

  function restoreLevel() {
    $('menu-level').textContent = 'Phiên 2 phút liên tục';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
