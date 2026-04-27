// ============================================================
// settings.js — Quản lý cài đặt ứng dụng
// ============================================================

BBMV.settings = (() => {
  const LS_KEY = 'bbmv_settings';

  const DEFAULTS = {
    musicVol: 0.6,
    sfxVol: 0.7,
    voiceEnabled: true,
    butterflySize: 'medium',
    highContrast: false,
    reportPasswordHash: BBMV.utils.hashPin('1234'),
    language: 'vi'
  };

  const get = () => {
    const saved = BBMV.utils.lsGet(LS_KEY, {});
    const merged = { ...DEFAULTS, ...saved };
    if (saved.reportPassword && !saved.reportPasswordHash) {
      merged.reportPasswordHash = BBMV.utils.hashPin(saved.reportPassword);
      delete merged.reportPassword;
      BBMV.utils.lsSet(LS_KEY, merged);
    }
    return merged;
  };

  const set = (key, val) => {
    const s = get();
    s[key] = val;
    BBMV.utils.lsSet(LS_KEY, s);
    applySettings(s);
  };

  const applySettings = (s) => {
    BBMV.audio.setMusicVol(s.musicVol);
    BBMV.audio.setSfxVol(s.sfxVol);
    document.body.classList.toggle('high-contrast', !!s.highContrast);
  };

  const openPinModal = () => {
    const modal = BBMV.utils.$('modal-change-pin');
    const inputNew = BBMV.utils.$('input-new-pin');
    const inputConfirm = BBMV.utils.$('input-confirm-pin');
    if (!modal || !inputNew || !inputConfirm) return;
    inputNew.value = '';
    inputConfirm.value = '';
    modal.classList.remove('hidden');
    setTimeout(() => inputNew.focus(), 100);
  };

  const closePinModal = () => {
    const modal = BBMV.utils.$('modal-change-pin');
    if (modal) modal.classList.add('hidden');
  };

  const savePinFromModal = () => {
    const inputNew = BBMV.utils.$('input-new-pin');
    const inputConfirm = BBMV.utils.$('input-confirm-pin');
    if (!inputNew || !inputConfirm) return;

    const newPin = String(inputNew.value || '').trim();
    const confirmPin = String(inputConfirm.value || '').trim();

    if (!/^\d{4}$/.test(newPin)) {
      BBMV.utils.showToast('PIN mới phải gồm đúng 4 chữ số');
      inputNew.focus();
      return;
    }
    if (newPin !== confirmPin) {
      BBMV.utils.showToast('PIN nhập lại chưa khớp');
      inputConfirm.focus();
      return;
    }

    set('reportPasswordHash', BBMV.utils.hashPin(newPin));
    closePinModal();
    BBMV.utils.showToast('Đã đổi mật khẩu báo cáo!');
  };

  const render = () => {
    const body = BBMV.utils.$('settings-body');
    if (!body) return;
    const s = get();

    body.innerHTML = `
      <div class="settings-section">
        <div class="settings-section-title">🔊 Âm thanh</div>
        <div class="settings-row">
          <div><div class="settings-row-label">Nhạc nền</div><div class="settings-row-sub">Âm lượng nhạc nền</div></div>
          <input type="range" class="settings-slider" id="s-music-vol" min="0" max="1" step="0.05" value="${s.musicVol}" />
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Hiệu ứng âm thanh</div><div class="settings-row-sub">Âm lượng SFX</div></div>
          <input type="range" class="settings-slider" id="s-sfx-vol" min="0" max="1" step="0.05" value="${s.sfxVol}" />
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Giọng nói</div><div class="settings-row-sub">Bật/tắt đọc hướng dẫn</div></div>
          <label class="toggle"><input type="checkbox" id="s-voice" ${s.voiceEnabled ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🎮 Trò chơi</div>
        <div class="settings-row">
          <div><div class="settings-row-label">Kích thước bướm</div><div class="settings-row-sub">To hơn cho mắt yếu hơn</div></div>
          <div style="display:flex;gap:8px;">
            ${['small','medium','large'].map(sz => `
              <button class="age-btn ${s.butterflySize === sz ? 'selected' : ''}" data-size="${sz}" id="s-size-${sz}" style="padding:8px 12px;font-size:13px;">
                ${sz === 'small' ? 'Nhỏ' : sz === 'medium' ? 'Vừa' : 'To'}
              </button>`).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Tương phản cao</div><div class="settings-row-sub">Viền đậm, màu sắc rõ hơn</div></div>
          <label class="toggle"><input type="checkbox" id="s-contrast" ${s.highContrast ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🔒 Bảo mật</div>
        <div class="settings-row">
          <div><div class="settings-row-label">Mật khẩu báo cáo</div><div class="settings-row-sub">Mặc định: 1234</div></div>
          <button class="btn-secondary" id="s-change-pwd" style="font-size:14px;padding:10px 16px;">Đổi mật khẩu</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">💾 Dữ liệu</div>
        <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:10px;">
          <div class="settings-row-label">Dung lượng đã dùng</div>
          <div class="settings-row-sub">~${BBMV.utils.lsUsedMB()} MB / 5 MB</div>
          ${parseFloat(BBMV.utils.lsUsedMB()) > 3.5 ? '<div style="color:#E87878;font-size:13px;font-weight:700;">⚠️ Gần đầy! Vui lòng xuất PDF hoặc sao lưu dữ liệu.</div>' : ''}
        </div>
        <div class="settings-row">
          <div class="settings-row-label">Xóa toàn bộ dữ liệu</div>
          <button class="btn-secondary" id="s-clear-data" style="font-size:13px;padding:10px 14px;border-color:var(--pink-deep);color:#C0392B;">Xóa tất cả</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Thông tin</div>
        <div class="settings-row"><div class="settings-row-label">Phiên bản</div><div class="settings-row-sub">v2.1.0</div></div>
        <div class="settings-row"><div class="settings-row-label">Mô tả</div><div class="settings-row-sub" style="font-size:12px;line-height:1.5;">Ứng dụng hỗ trợ tập luyện nhược thị cho trẻ 4–7 tuổi.<br/>Dùng mỗi ngày theo hướng dẫn của bác sĩ.</div></div>
      </div>
    `;

    bindSettingsEvents();
    applySettings(s);
  };

  const bindSettingsEvents = () => {
    BBMV.utils.$('s-music-vol')?.addEventListener('input', (e) => set('musicVol', parseFloat(e.target.value)));
    BBMV.utils.$('s-sfx-vol')?.addEventListener('input', (e) => set('sfxVol', parseFloat(e.target.value)));
    BBMV.utils.$('s-voice')?.addEventListener('change', (e) => set('voiceEnabled', e.target.checked));
    BBMV.utils.$('s-contrast')?.addEventListener('change', (e) => set('highContrast', e.target.checked));

    ['small','medium','large'].forEach(sz => {
      BBMV.utils.$(`s-size-${sz}`)?.addEventListener('pointerdown', () => {
        BBMV.audio.sfx.button();
        set('butterflySize', sz);
        render();
      });
    });

    BBMV.utils.$('s-change-pwd')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      openPinModal();
    });

    BBMV.utils.$('s-clear-data')?.addEventListener('pointerdown', () => {
      BBMV.utils.confirm('⚠️ Xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác!', () => {
        BBMV.utils.lsClearByPrefix('bbmv_');
        BBMV.profile.ensureDefaultProfile?.();
        BBMV.utils.showToast('Đã xóa toàn bộ dữ liệu');
        BBMV.utils.showScreen('menu');
        BBMV.profile.renderMenuScreen?.();
      });
    });

    BBMV.utils.$('btn-cancel-pin')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      closePinModal();
    });
    BBMV.utils.$('btn-save-pin')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      savePinFromModal();
    });
    BBMV.utils.$('modal-change-pin')?.addEventListener('pointerdown', (e) => {
      if (e.target === BBMV.utils.$('modal-change-pin')) closePinModal();
    });
  };

  const bindEvents = () => {
    BBMV.utils.$('btn-settings')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      render();
      BBMV.utils.showScreen('settings');
    });
    BBMV.utils.$('btn-settings-back')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.showScreen('menu');
    });
  };

  return { get, set, applySettings, render, bindEvents, openPinModal, closePinModal };
})();
