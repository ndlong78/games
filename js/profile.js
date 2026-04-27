// ============================================================
// profile.js — Quản lý hồ sơ trẻ em (CRUD + localStorage)
// ============================================================

BBMV.profile = (() => {
  const LS_KEY = 'bbmv_profiles';
  const AVATARS = ['🐣','🐥','🐰','🐻','🦊','🐸','🦄','🐼'];
  const EYE_LABEL = { left: 'Mắt trái', right: 'Mắt phải', both: 'Cả hai mắt' };

  let currentProfileId = null;
  let selectedAvatar = AVATARS[0];
  let selectedAge = 5;
  let selectedEye = 'right';
  let editingId = null;
  let skipConfirmCount = 0;
  let lastLoadError = null;

  const buildDefaultProfile = () => ({
    id: BBMV.utils.uuid(),
    name: 'Bé mới',
    avatar: AVATARS[0],
    age: 5,
    eye: 'right',
    createdAt: BBMV.utils.now()
  });

  const normalizeProfile = (raw, idx = 0) => {
    if (!raw || typeof raw !== 'object') return null;

    const safeName = BBMV.utils.sanitizeChildName(raw.name);
    const validName = BBMV.utils.isValidChildName(safeName) ? safeName : `Bé ${idx + 1}`;
    const parsedAge = Number.parseInt(raw.age, 10);
    const age = Number.isFinite(parsedAge) ? BBMV.utils.clamp(parsedAge, 3, 10) : 5;
    const eye = ['left', 'right', 'both'].includes(raw.eye) ? raw.eye : 'right';
    const avatar = AVATARS.includes(raw.avatar) ? raw.avatar : AVATARS[0];
    const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
    const id = /^[a-zA-Z0-9_-]{6,64}$/.test(rawId) ? rawId : BBMV.utils.uuid();
    const createdAt = Number.isNaN(new Date(raw.createdAt).getTime()) ? BBMV.utils.now() : raw.createdAt;

    return { id, name: validName, avatar, age, eye, createdAt };
  };

  const getAll = () => {
    lastLoadError = null;
    try {
      const raw = BBMV.utils.lsGet(LS_KEY, [], {
        resetOnError: true,
        logError: true,
        logPrefix: '[BBMV][profile]'
      });
      const isRawObject = raw && typeof raw === 'object';
      const source = Array.isArray(raw) ? raw : Object.values(isRawObject ? raw : {});
      const normalized = source
        .map((item, idx) => normalizeProfile(item, idx))
        .filter(Boolean);

      const shouldMigrate = !Array.isArray(raw) || normalized.length !== source.length ||
        JSON.stringify(source) !== JSON.stringify(normalized);
      if (shouldMigrate) {
        const safeList = normalized.length > 0 ? normalized : [buildDefaultProfile()];
        BBMV.utils.lsSet(LS_KEY, safeList);
        if (source.length > 0 && normalized.length === 0) {
          lastLoadError = 'invalid_profiles_shape';
          console.error('[BBMV][profile] Hồ sơ bị lỗi cấu trúc, đã reset về profile mặc định an toàn.');
        }
        return safeList;
      }
      return normalized;
    } catch (err) {
      lastLoadError = 'profile_load_failed';
      console.error('[BBMV][profile] Lỗi khi tải hồ sơ:', err);
      const fallback = [buildDefaultProfile()];
      BBMV.utils.lsSet(LS_KEY, fallback);
      return fallback;
    }
  };

  const saveAll = (list) => {
    const safeList = Array.isArray(list)
      ? list.map((item, idx) => normalizeProfile(item, idx)).filter(Boolean)
      : [];
    BBMV.utils.lsSet(LS_KEY, safeList);
  };
  const getById = (id) => getAll().find(p => p.id === id) || null;

  const getCurrent = () => {
    if (!currentProfileId) return null;
    return getById(currentProfileId);
  };

  const setCurrent = (id) => {
    currentProfileId = getById(id) ? id : null;
    return currentProfileId;
  };

  const create = (name, avatar, age, eye) => {
    const list = getAll();
    const safeName = BBMV.utils.sanitizeChildName(name);
    const p = { id: BBMV.utils.uuid(), name: safeName, avatar, age, eye, createdAt: BBMV.utils.now() };
    list.push(p);
    saveAll(list);
    return p;
  };

  const update = (id, data) => {
    const list = getAll();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return false;
    Object.assign(list[idx], data);
    saveAll(list);
    return true;
  };

  const remove = (id) => {
    let list = getAll();
    list = list.filter(p => p.id !== id);
    saveAll(list);
    const sessions = BBMV.utils.lsGet('bbmv_sessions', []);
    BBMV.utils.lsSet('bbmv_sessions', sessions.filter(s => s.profileId !== id));
  };

  const renderProfilesScreen = () => {
    const grid = BBMV.utils.$('profiles-grid');
    if (!grid) return;
    const list = getAll();
    grid.innerHTML = '';

    if (lastLoadError) {
      const warn = document.createElement('div');
      warn.style.cssText = 'grid-column:1/-1;background:#FFF4E8;border:2px solid #FFD0A6;border-radius:18px;padding:14px 16px;margin-bottom:10px;color:#8A4B08;font-weight:700;line-height:1.45;';
      warn.textContent = 'Hồ sơ bị lỗi dữ liệu. Vui lòng tạo lại hồ sơ hoặc reset dữ liệu.';
      grid.appendChild(warn);
    }

    if (!list.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:32px;color:var(--text-mid);font-size:18px;font-weight:700;';
      empty.innerHTML = 'Chưa có hồ sơ nào.<br/>Hãy thêm hồ sơ cho bé nhé! 😊';
      grid.appendChild(empty);
      return;
    }

    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.innerHTML = `
        <div class="profile-avatar">${p.avatar}</div>
        <div class="profile-name">${BBMV.utils.escapeHTML(p.name)}</div>
        <div class="profile-info">${p.age} tuổi · ${EYE_LABEL[p.eye] || ''}</div>
        <button class="profile-delete" data-id="${p.id}" title="Xóa hồ sơ">✕</button>
      `;
      card.addEventListener('pointerdown', (e) => {
        if (e.target instanceof Element && e.target.closest('.profile-delete')) return;
        BBMV.audio.sfx.button();
        const selectedId = setCurrent(p.id);
        if (!selectedId) {
          BBMV.utils.showToast('Không thể mở hồ sơ này. Vui lòng tạo lại hồ sơ mới.');
          renderProfilesScreen();
          return;
        }
        try {
          console.log('[BBMV] profile.select', p.id);
          const rendered = renderMenuScreen();
          if (!rendered) throw new Error('renderMenuScreen() failed');
          const shown = BBMV.utils.showScreen('screen-menu');
          if (!shown) throw new Error('showScreen(screen-menu) failed');
          BBMV.audio.speak(`Chào ${p.name}! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!`, true);
        } catch (err) {
          console.error('[BBMV] Failed to open profile menu:', err);
          BBMV.utils.showToast('Có lỗi khi mở hồ sơ. Vui lòng thử lại.');
          BBMV.utils.showScreen('screen-profiles');
          renderProfilesScreen();
        }
      });
      card.querySelector('.profile-delete')?.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        BBMV.utils.confirm(
          `Bạn có chắc muốn xóa hồ sơ của ${p.name}?`,
          () => {
            remove(p.id);
            renderProfilesScreen();
            BBMV.utils.showToast(`Đã xóa hồ sơ ${p.name}`);
          }
        );
      });
      grid.appendChild(card);
    });
  };

  const openModal = (id = null) => {
    editingId = id;
    const modal = BBMV.utils.$('modal-profile');
    const title = BBMV.utils.$('modal-profile-title');

    if (id) {
      const p = getById(id);
      if (!p) return;
      selectedAvatar = p.avatar;
      selectedAge = p.age;
      selectedEye = p.eye;
      BBMV.utils.$('input-name').value = p.name;
      title.textContent = 'Chỉnh sửa hồ sơ';
    } else {
      selectedAvatar = AVATARS[0];
      selectedAge = 5;
      selectedEye = 'right';
      BBMV.utils.$('input-name').value = '';
      title.textContent = 'Hồ sơ mới';
    }

    renderAvatarPicker();
    renderAgePicker();
    renderEyePicker();
    modal.classList.remove('hidden');
    setTimeout(() => BBMV.utils.$('input-name').focus(), 100);
  };

  const closeModal = () => {
    BBMV.utils.$('modal-profile').classList.add('hidden');
    editingId = null;
  };

  const saveModal = () => {
    const rawName = BBMV.utils.$('input-name').value;
    const name = BBMV.utils.sanitizeChildName(rawName);
    if (!BBMV.utils.isValidChildName(name)) {
      BBMV.utils.showToast('Tên bé cần từ 1-20 ký tự hợp lệ! 😊');
      return;
    }
    if (editingId) {
      update(editingId, { name, avatar: selectedAvatar, age: selectedAge, eye: selectedEye });
      BBMV.utils.showToast('Đã cập nhật hồ sơ!');
    } else {
      create(name, selectedAvatar, selectedAge, selectedEye);
      BBMV.utils.showToast(`Đã tạo hồ sơ cho ${name}!`);
    }
    closeModal();
    renderProfilesScreen();
  };

  const renderAvatarPicker = () => {
    const picker = BBMV.utils.$('avatar-picker');
    if (!picker) return;
    picker.innerHTML = '';
    AVATARS.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'avatar-option' + (a === selectedAvatar ? ' selected' : '');
      btn.textContent = a;
      btn.addEventListener('pointerdown', () => {
        selectedAvatar = a;
        picker.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        BBMV.audio.sfx.button();
      });
      picker.appendChild(btn);
    });
  };

  const renderAgePicker = () => {
    const sel = BBMV.utils.$('age-selector');
    if (!sel) return;
    sel.innerHTML = '';
    for (let age = 3; age <= 10; age++) {
      const btn = document.createElement('button');
      btn.className = 'age-btn' + (age === selectedAge ? ' selected' : '');
      btn.textContent = `${age} tuổi`;
      btn.addEventListener('pointerdown', () => {
        selectedAge = age;
        sel.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        BBMV.audio.sfx.button();
      });
      sel.appendChild(btn);
    }
  };

  const renderEyePicker = () => {
    ['left','right','both'].forEach(eye => {
      const btn = BBMV.utils.$(`eye-${eye}`);
      if (!btn) return;
      btn.className = 'btn-eye' + (eye === selectedEye ? ' selected' : '');
      btn.onclick = () => {
        selectedEye = eye;
        ['left','right','both'].forEach(e => {
          const b = BBMV.utils.$(`eye-${e}`);
          if (b) b.className = 'btn-eye' + (e === selectedEye ? ' selected' : '');
        });
        BBMV.audio.sfx.button();
      };
    });
  };

  const renderMenuScreen = () => {
    try {
      const p = getCurrent();
      if (!p) {
        const chipName = BBMV.utils.$('chip-name');
        if (chipName) chipName.textContent = 'Hồ sơ lỗi';
        BBMV.utils.showToast('Hồ sơ bị lỗi dữ liệu. Vui lòng tạo lại hồ sơ hoặc reset dữ liệu.');
        return false;
      }
      const chipAvatar = BBMV.utils.$('chip-avatar');
      const chipName = BBMV.utils.$('chip-name');
      if (chipAvatar) chipAvatar.textContent = p.avatar;
      if (chipName) chipName.textContent = p.name;

      const streak = BBMV.gamification ? BBMV.gamification.getStreak(p.id) : 0;
      const streakEl = BBMV.utils.$('menu-streak');
      if (streakEl) streakEl.textContent = streak > 0 ? `🔥 ${streak} ngày` : `🌟 Chơi thôi!`;
      return true;
    } catch (err) {
      console.error('[BBMV][profile] renderMenuScreen failed:', err);
      BBMV.utils.showToast('Hồ sơ bị lỗi dữ liệu. Vui lòng tạo lại hồ sơ hoặc reset dữ liệu.');
      return false;
    }
  };

  const bindEvents = () => {
    BBMV.utils.$('btn-add-profile')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      openModal();
    });
    BBMV.utils.$('btn-cancel-profile')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      closeModal();
    });
    BBMV.utils.$('btn-save-profile')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      saveModal();
    });
    BBMV.utils.$('btn-switch-profile')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.showScreen('screen-profiles');
      renderProfilesScreen();
    });
    BBMV.utils.$('modal-profile')?.addEventListener('pointerdown', (e) => {
      if (e.target === BBMV.utils.$('modal-profile')) closeModal();
    });
  };

  return {
    getAll, getById, getCurrent, setCurrent, create, update, remove,
    renderProfilesScreen, renderMenuScreen, openModal, closeModal,
    bindEvents, AVATARS, EYE_LABEL
  };
})();
