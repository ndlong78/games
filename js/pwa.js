// ============================================================
// pwa.js — Service Worker & Install prompt
// ============================================================

BBMV.pwa = (() => {
  let deferredPrompt = null;

  const clearOldCachesAndWorkers = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      console.log('[BBMV] Cleared old service workers and caches');
    } catch (err) {
      console.error('[BBMV] Failed clearing service workers/caches:', err);
    }
  };

  const register = async () => {
    // Tạm thời gỡ SW cũ để tránh lỗi trắng màn hình do lệch cache asset trên Safari/GitHub Pages.
    await clearOldCachesAndWorkers();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = BBMV.utils.$('install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      const banner = BBMV.utils.$('install-banner');
      if (banner) banner.classList.add('hidden');
      BBMV.utils.showToast('🎉 Đã cài app thành công!');
    });
  };

  const bindEvents = () => {
    BBMV.utils.$('btn-install')?.addEventListener('pointerdown', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') BBMV.utils.showToast('Đang cài app...');
      deferredPrompt = null;
    });
    BBMV.utils.$('btn-install-dismiss')?.addEventListener('pointerdown', () => {
      const banner = BBMV.utils.$('install-banner');
      if (banner) banner.classList.add('hidden');
    });
  };

  return { register, bindEvents, clearOldCachesAndWorkers };
})();
