// ============================================================
// utils.js — Hàm tiện ích dùng chung toàn app
// ============================================================

const BBMV = window.BBMV || {};

BBMV.utils = {
  _lastScreenId: null,
  _lastScreenName: null,
  _transitioning: false,
  _transitionSince: 0,
  _screenNameToId: {
    loading: 'screen-loading',
    profile: 'screen-profiles',
    profiles: 'screen-profiles',
    menu: 'screen-menu',
    patch: 'screen-camera',
    camera: 'screen-camera',
    game: 'screen-game',
    complete: 'screen-complete',
    badges: 'screen-badges',
    report: 'screen-report',
    reports: 'screen-report',
    settings: 'screen-settings'
  },

  $: (id) => document.getElementById(id),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),
  rand: (min, max) => Math.random() * (max - min) + min,
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  formatTime: (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  },
  formatDate: (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  },
  formatDateTime: (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  debounce: (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; },

  showToast: (msg, duration = 2500) => {
    const toast = BBMV.utils.$('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden', 'out');
    clearTimeout(BBMV.utils._toastTimer);
    BBMV.utils._toastTimer = setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  },

  uuid: () => Math.random().toString(36).slice(2) + Date.now().toString(36),
  escapeHTML: (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
  sanitizeChildName: (value) => String(value ?? '').replace(/[<>"'`&]/g, '').replace(/\s+/g, ' ').trim(),
  isValidChildName: (value) => {
    const n = BBMV.utils.sanitizeChildName(value);
    return n.length >= 1 && n.length <= 20;
  },
  hashPin: (pin) => {
    const text = `bbmv_pin:${String(pin ?? '')}`;
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv1a_${(h >>> 0).toString(16).padStart(8, '0')}`;
  },

  clone: (obj) => JSON.parse(JSON.stringify(obj)),
  lsSet: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e) { console.error('[BBMV] localStorage write error:', e); return false; } },
  lsGet: (key, fallback = null, options = {}) => {
    const { resetOnError = false, logError = false, logPrefix = '[BBMV]' } = options || {};
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (e) {
      if (logError) console.error(`${logPrefix} localStorage parse error at key "${key}":`, e);
      if (resetOnError) {
        try { localStorage.setItem(key, JSON.stringify(fallback)); } catch (_) {}
      }
      return fallback;
    }
  },
  lsDel: (key) => { try { localStorage.removeItem(key); } catch(e) {} },
  lsClearByPrefix: (prefix) => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      return keys.length;
    } catch(e) { return 0; }
  },
  lsUsedMB: () => {
    try {
      let total = 0;
      for (const k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)) total += (localStorage[k].length + k.length) * 2;
      }
      return (total / 1024 / 1024).toFixed(2);
    } catch(e) { return 0; }
  },

  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0],
  daysBetween: (d1, d2) => {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    return Math.round(Math.abs(t2 - t1) / 86400000);
  },
  cubicBezier: (p0, p1, p2, p3, t) => {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
    };
  },

  setTransitioning: (value) => {
    BBMV.utils._transitioning = !!value;
    BBMV.utils._transitionSince = value ? Date.now() : 0;
  },

  resolveScreenTarget: (nameOrId) => {
    const raw = String(nameOrId || '').trim();
    const normalized = raw.replace(/^screen-/, '').toLowerCase();
    const mappedId = BBMV.utils._screenNameToId[normalized] || (raw.startsWith('screen-') ? raw : `screen-${normalized}`);
    const target = BBMV.utils.$(mappedId)
      || document.querySelector(`.screen[data-screen="${normalized}"]`)
      || document.querySelector(`.screen[data-screen="${raw.toLowerCase()}"]`);
    const screenName = target?.dataset?.screen || normalized;
    return { raw, normalized, mappedId, target, screenName };
  },

  showScreen: (nameOrId, options = {}) => {
    const { fatalOnMissing = false } = options;
    const { raw, mappedId, target, screenName } = BBMV.utils.resolveScreenTarget(nameOrId);
    if (!target) {
      const error = new Error(`Screen target not found for "${raw}" -> "${mappedId}"`);
      console.error('[BBMV] showScreen target missing:', error.message);
      if (fatalOnMissing && typeof BBMV.utils.showFatalError === 'function') {
        BBMV.utils.showFatalError(`Không tìm thấy màn hình "${raw}" để hiển thị.`, error);
      }
      return false;
    }

    try {
      BBMV.utils.setTransitioning(true);
      document.querySelectorAll('.screen').forEach((s) => {
        s.classList.remove('active', 'slide-in');
        s.setAttribute('aria-hidden', 'true');
        if (typeof s.setAttribute === 'function') s.setAttribute('hidden', '');
      });

      if (typeof target.removeAttribute === 'function') target.removeAttribute('hidden');
      if (target.classList?.remove) target.classList.remove('hidden');
      if (target.style?.removeProperty) target.style.removeProperty('display');
      target.classList.add('active');
      target.setAttribute('aria-hidden', 'false');
      BBMV.utils._lastScreenId = target.id || mappedId;
      BBMV.utils._lastScreenName = screenName;
      if (document.body?.classList) {
        Array.from(document.body.classList).forEach((cls) => {
          if (cls.startsWith('screen-')) document.body.classList.remove(cls);
        });
        document.body.classList.add(`screen-${screenName}`);
      }

      requestAnimationFrame(() => {
        target.classList.add('slide-in');
        setTimeout(() => BBMV.utils.setTransitioning(false), 500);
      });

      // Failsafe: nếu animation callback bị miss (Safari/background tab), vẫn mở lại state.
      setTimeout(() => {
        if (!target.classList.contains('active')) target.classList.add('active');
        BBMV.utils.setTransitioning(false);
      }, 900);

      const getComputed = typeof window.getComputedStyle === 'function'
        ? window.getComputedStyle.bind(window)
        : () => ({ display: 'unknown', visibility: 'unknown', opacity: 'unknown' });
      const screenComputed = getComputed(target);
      const appComputed = getComputed(BBMV.utils.$('app') || document.body);
      const bodyComputed = getComputed(document.body);
      console.log(
        '[BBMV] showScreen',
        screenName,
        'found',
        !!target,
        'display',
        screenComputed.display,
        'visibility',
        screenComputed.visibility,
        'opacity',
        screenComputed.opacity,
        'size',
        `${target.offsetWidth}x${target.offsetHeight}`
      );
      if (
        appComputed.display === 'none' || appComputed.visibility === 'hidden' || appComputed.opacity === '0' ||
        bodyComputed.display === 'none' || bodyComputed.visibility === 'hidden' || bodyComputed.opacity === '0'
      ) {
        console.warn('[BBMV] showScreen root visibility warning:', {
          app: { display: appComputed.display, visibility: appComputed.visibility, opacity: appComputed.opacity },
          body: { display: bodyComputed.display, visibility: bodyComputed.visibility, opacity: bodyComputed.opacity }
        });
      }
      return true;
    } catch (err) {
      BBMV.utils.setTransitioning(false);
      console.error('[BBMV] showScreen failed:', err);
      return false;
    }
  },

  ensureVisibleScreen: () => {
    if (BBMV.utils._transitioning) {
      const elapsed = Date.now() - (BBMV.utils._transitionSince || 0);
      if (elapsed < 1500) return true;
      console.warn('[BBMV] Transition timeout, force recovering visible screen.');
      BBMV.utils.setTransitioning(false);
    }
    const active = document.querySelector('.screen.active');
    if (active) return true;
    const fallbackScreen = BBMV.utils._lastScreenName || BBMV.utils._lastScreenId || 'profile';
    const ok = BBMV.utils.showScreen(fallbackScreen, { fatalOnMissing: false });
    if (!ok && fallbackScreen !== 'profile') BBMV.utils.showScreen('profile', { fatalOnMissing: false });
    console.warn('[BBMV] Recovered from blank screen, restored:', fallbackScreen);
    return false;
  },

  showCrashOverlay: (message) => {
    let el = BBMV.utils.$('bbmv-crash-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bbmv-crash-overlay';
      el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(45,74,90,0.92);color:#fff;padding:24px;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div style="max-width:420px;width:100%;background:#fff;color:#2D4A5A;border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:Nunito,sans-serif;">
        <div style="font-family:'Baloo 2',cursive;font-size:24px;font-weight:800;margin-bottom:12px;">⚠️ Ứng dụng gặp lỗi</div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${BBMV.utils.escapeHTML(message || 'Unknown error')}</div>
        <button id="bbmv-crash-reload" style="margin-top:16px;width:100%;border:none;border-radius:99px;padding:14px 18px;background:linear-gradient(135deg,#8DD5EE,#5BC4E8);color:#fff;font-weight:800;font-size:16px;">Tải lại ứng dụng</button>
      </div>`;
    el.querySelector('#bbmv-crash-reload').onclick = () => location.reload();
  },

  showFallbackScreen: (reason = 'unknown') => {
    console.error('[BBMV] showFallbackScreen:', reason);
    const app = BBMV.utils.$('app') || document.body;
    if (!app) return;

    BBMV.utils.setTransitioning(false);
    document.querySelectorAll('.screen').forEach((s) => {
      s.classList.remove('active', 'slide-in');
      s.setAttribute('aria-hidden', 'true');
    });

    let fallback = BBMV.utils.$('screen-fallback');
    if (!fallback) {
      fallback = document.createElement('div');
      fallback.id = 'screen-fallback';
      fallback.className = 'screen active';
      fallback.setAttribute('aria-hidden', 'false');
      fallback.innerHTML = `
        <div style="max-width:420px;margin:40px auto;padding:24px;border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(45,74,90,0.2);text-align:center;">
          <h2 style="margin:0 0 10px;font-family:'Baloo 2',cursive;color:#2D4A5A;">⚠️ Ứng dụng đang phục hồi</h2>
          <p style="margin:0 0 16px;color:#3C5968;line-height:1.5;">Đã xảy ra lỗi ở một module. Bạn vẫn có thể quay về màn hình chọn hồ sơ.</p>
          <button id="btn-fallback-profiles" style="border:none;border-radius:99px;padding:12px 16px;background:linear-gradient(135deg,#8DD5EE,#5BC4E8);color:#fff;font-weight:700;cursor:pointer;">Về chọn hồ sơ</button>
        </div>
      `;
      app.appendChild(fallback);
      fallback.querySelector('#btn-fallback-profiles')?.addEventListener('pointerdown', () => {
        const profiles = BBMV.utils.$('screen-profiles');
        fallback.classList.remove('active');
        fallback.setAttribute('aria-hidden', 'true');
        if (profiles) {
          profiles.classList.add('active');
          profiles.setAttribute('aria-hidden', 'false');
          BBMV.utils._lastScreenId = 'screen-profiles';
        }
      });
    } else {
      fallback.classList.add('active');
      fallback.setAttribute('aria-hidden', 'false');
    }
  },

  showFatalError: (message, error = null) => {
    const safeMessage = message || 'Đã có lỗi không mong muốn xảy ra.';
    const details = error?.message || String(error || '');
    console.error('[BBMV] Fatal error screen:', safeMessage, error || '');

    BBMV.utils.setTransitioning(false);
    document.querySelectorAll('.screen').forEach((s) => {
      s.classList.remove('active', 'slide-in');
      s.setAttribute('aria-hidden', 'true');
    });

    const app = BBMV.utils.$('app') || document.body;
    if (!app) return;

    let fatal = BBMV.utils.$('screen-fatal-error');
    if (!fatal) {
      fatal = document.createElement('div');
      fatal.id = 'screen-fatal-error';
      fatal.className = 'screen';
      app.appendChild(fatal);
    }

    fatal.innerHTML = `
      <div style="max-width:460px;margin:40px auto;padding:24px;border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(45,74,90,0.2);text-align:center;">
        <h2 style="margin:0 0 10px;font-family:'Baloo 2',cursive;color:#2D4A5A;">⚠️ Không thể mở hồ sơ</h2>
        <p style="margin:0 0 10px;color:#3C5968;line-height:1.5;">${BBMV.utils.escapeHTML(safeMessage)}</p>
        ${details ? `<p style="margin:0 0 16px;color:#6B7F8A;font-size:13px;line-height:1.45;">Chi tiết: ${BBMV.utils.escapeHTML(details)}</p>` : ''}
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button id="btn-fatal-back-profiles" style="border:none;border-radius:99px;padding:12px 16px;background:linear-gradient(135deg,#8DD5EE,#5BC4E8);color:#fff;font-weight:700;cursor:pointer;">Về chọn hồ sơ</button>
          <button id="btn-fatal-reload" style="border:2px solid #CDE6F0;border-radius:99px;padding:12px 16px;background:#fff;color:#2D4A5A;font-weight:700;cursor:pointer;">Tải lại</button>
        </div>
      </div>
    `;

    fatal.classList.add('active');
    fatal.setAttribute('aria-hidden', 'false');
    BBMV.utils._lastScreenId = 'screen-fatal-error';

    fatal.querySelector('#btn-fatal-back-profiles')?.addEventListener('pointerdown', () => {
      const ok = BBMV.utils.showScreen('profile');
      if (!ok) BBMV.utils.showFallbackScreen('fatal-back-profiles');
    });
    fatal.querySelector('#btn-fatal-reload')?.addEventListener('pointerdown', () => location.reload());
  },

  loadScript: (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  }),

  resizeCanvas: (canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w: rect.width, h: rect.height, dpr };
  },

  getEventPos: (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr };
  },

  confirm: (msg, onYes, onNo) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(45,74,90,0.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;`;
    overlay.innerHTML = `
      <div style="background:white;border-radius:24px;padding:28px 24px;max-width:320px;width:100%;display:flex;flex-direction:column;gap:16px;box-shadow:0 20px 60px rgba(45,74,90,0.3);">
        <p style="font-family:'Baloo 2',cursive;font-size:18px;font-weight:700;color:#2D4A5A;text-align:center;line-height:1.4;">${BBMV.utils.escapeHTML(msg)}</p>
        <div style="display:flex;gap:12px;">
          <button id="_cfm-no" style="flex:1;background:rgba(200,230,240,0.5);border:2px solid rgba(200,230,240,0.8);border-radius:99px;padding:14px;font-size:16px;font-weight:700;font-family:'Nunito',sans-serif;cursor:pointer;">Không</button>
          <button id="_cfm-yes" style="flex:1;background:linear-gradient(135deg,#FF9EB5,#FFD6E0);border:none;border-radius:99px;padding:14px;font-size:16px;font-weight:700;font-family:'Nunito',sans-serif;cursor:pointer;">Có</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_cfm-yes').onclick = () => { overlay.remove(); onYes && onYes(); };
    overlay.querySelector('#_cfm-no').onclick = () => { overlay.remove(); onNo && onNo(); };
  }
};

window.BBMV = BBMV;
