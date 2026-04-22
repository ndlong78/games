// ============================================================
// pwa.js — Service Worker & Install prompt
// ============================================================

BBMV.pwa = (() => {
  let deferredPrompt = null;

  const register = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[BBMV] SW registered:', reg.scope))
        .catch(err => console.error('[BBMV] SW error:', err));
    }
    // Bắt sự kiện install prompt (Android Chrome)
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

  return { register, bindEvents };
})();
