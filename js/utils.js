// ============================================================
// utils.js — Hàm tiện ích dùng chung toàn app
// ============================================================

const BBMV = window.BBMV || {};

BBMV.utils = {

  // Lấy element DOM theo id
  $: (id) => document.getElementById(id),

  // Lerp (nội suy tuyến tính)
  lerp: (a, b, t) => a + (b - a) * t,

  // Khoảng cách giữa 2 điểm
  dist: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),

  // Clamp giá trị trong khoảng [min, max]
  clamp: (v, min, max) => Math.min(Math.max(v, min), max),

  // Random trong khoảng [min, max]
  rand: (min, max) => Math.random() * (max - min) + min,

  // Random số nguyên trong [min, max]
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Định dạng giây thành mm:ss
  formatTime: (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  },

  // Định dạng ngày giờ tiếng Việt
  formatDate: (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  },

  // Định dạng giờ:phút tiếng Việt
  formatDateTime: (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  },

  // Debounce: trì hoãn gọi hàm
  debounce: (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // Toast notification
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

  // Tạo UUID đơn giản
  uuid: () => Math.random().toString(36).slice(2) + Date.now().toString(36),

  // Escape HTML để tránh chèn script khi dùng innerHTML
  escapeHTML: (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;'),

  // Làm sạch tên bé: bỏ khoảng trắng dư + loại ký tự nguy hiểm
  sanitizeChildName: (value) => String(value ?? '')
    .replace(/[<>"'`&]/g, '')
    .replace(/\s+/g, ' ')
    .trim(),

  // Validate tên bé theo chuẩn tối thiểu
  isValidChildName: (value) => {
    const n = BBMV.utils.sanitizeChildName(value);
    return n.length >= 1 && n.length <= 20;
  },

  // Hash PIN dạng nhẹ để không lưu plaintext trực tiếp trong localStorage
  // Lưu ý: đây không phải hash mật mã mạnh, chỉ nhằm giảm lộ dữ liệu trực tiếp.
  hashPin: (pin) => {
    const text = `bbmv_pin:${String(pin ?? '')}`;
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv1a_${(h >>> 0).toString(16).padStart(8, '0')}`;
  },

  // Deep clone object
  clone: (obj) => JSON.parse(JSON.stringify(obj)),

  // Lưu localStorage an toàn
  lsSet: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch(e) { console.error('[BBMV] localStorage write error:', e); return false; }
  },

  // Đọc localStorage an toàn
  lsGet: (key, fallback = null) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch(e) { return fallback; }
  },

  // Xóa localStorage key
  lsDel: (key) => { try { localStorage.removeItem(key); } catch(e) {} },

  // Xóa localStorage theo prefix key để tránh xóa nhầm app khác cùng origin
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

  // Kiểm tra dung lượng localStorage (trả về MB đã dùng xấp xỉ)
  lsUsedMB: () => {
    try {
      let total = 0;
      for (const k in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
          total += (localStorage[k].length + k.length) * 2;
        }
      }
      return (total / 1024 / 1024).toFixed(2);
    } catch(e) { return 0; }
  },

  // Lấy thời gian hiện tại ISO
  now: () => new Date().toISOString(),

  // Lấy ngày hôm nay dạng YYYY-MM-DD
  today: () => new Date().toISOString().split('T')[0],

  // So sánh 2 ngày (YYYY-MM-DD)
  daysBetween: (d1, d2) => {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    return Math.round(Math.abs(t2 - t1) / 86400000);
  },

  // Tạo Bezier cubic path points
  cubicBezier: (p0, p1, p2, p3, t) => {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
    };
  },

  // Hiển thị/ẩn screen
  showScreen: (id) => {
    const target = BBMV.utils.$(id);
    if (!target) {
      // Không được ẩn toàn bộ màn hình nếu id sai — tránh rơi vào "màn hình trắng"
      console.error(`[BBMV] showScreen: không tìm thấy màn hình "${id}"`);
      return false;
    }

    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'slide-in');
    });

    target.classList.add('active');
    // Trigger animation
    requestAnimationFrame(() => target.classList.add('slide-in'));
    return true;
  },

  // Tải script động (lazy-load)
  loadScript: (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  }),

  // Resize canvas với devicePixelRatio (retina)
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

  // Lấy vị trí touch/mouse từ event
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
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
    };
  },

  // Confirm dialog tiếng Việt (custom, non-blocking)
  confirm: (msg, onYes, onNo) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(45,74,90,0.6);
      backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;
      padding:24px;`;
    overlay.innerHTML = `
      <div style="background:white;border-radius:24px;padding:28px 24px;max-width:320px;width:100%;
        display:flex;flex-direction:column;gap:16px;box-shadow:0 20px 60px rgba(45,74,90,0.3);">
        <p style="font-family:'Baloo 2',cursive;font-size:18px;font-weight:700;color:#2D4A5A;
          text-align:center;line-height:1.4;">${BBMV.utils.escapeHTML(msg)}</p>
        <div style="display:flex;gap:12px;">
          <button id="_cfm-no" style="flex:1;background:rgba(200,230,240,0.5);border:2px solid rgba(200,230,240,0.8);
            border-radius:99px;padding:14px;font-size:16px;font-weight:700;font-family:'Nunito',sans-serif;
            cursor:pointer;">Không</button>
          <button id="_cfm-yes" style="flex:1;background:linear-gradient(135deg,#FF9EB5,#FFD6E0);
            border:none;border-radius:99px;padding:14px;font-size:16px;font-weight:700;
            font-family:'Nunito',sans-serif;cursor:pointer;">Có</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#_cfm-yes').onclick = () => { overlay.remove(); onYes && onYes(); };
    overlay.querySelector('#_cfm-no').onclick = () => { overlay.remove(); onNo && onNo(); };
  }
};

window.BBMV = BBMV;
