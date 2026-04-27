// ============================================================
// pwa.js — Service Worker & Install prompt
// ============================================================

BBMV.pwa = (() => {
  let deferredPrompt = null;
  const APP_VERSION = '2026.04.27-2';
  const SW_VERSION_KEY = 'bbmv_sw_version';
  const DEBUG_SW_BYPASS_CACHE = true;

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

  const shouldPurgeCache = () => {
    const current = BBMV.utils.lsGet(SW_VERSION_KEY, null);
    return current !== APP_VERSION;
  };

  const register = async () => {
    if (shouldPurgeCache()) {
      // Chỉ purge khi version app thay đổi để tránh phục vụ JS cũ gây màn hình trắng.
      await clearOldCachesAndWorkers();
      BBMV.utils.lsSet(SW_VERSION_KEY, APP_VERSION);
    }

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(APP_VERSION)}`, {
          scope: './',
          updateViaCache: 'none'
        });
        if (DEBUG_SW_BYPASS_CACHE && navigator.serviceWorker.controller) {
          const ctrlUrl = navigator.serviceWorker.controller.scriptURL || '';
          if (!ctrlUrl.includes(APP_VERSION)) {
            console.warn('[BBMV] Old SW controller detected, forcing update:', ctrlUrl);
            await reg.update().catch(() => {});
          }
        } else {
          reg.update().catch(() => {});
        }
        if (DEBUG_SW_BYPASS_CACHE && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        console.log('[BBMV] Service Worker registered:', APP_VERSION);
      } catch (err) {
        console.error('[BBMV] Service Worker register failed:', err);
      }
    }

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
