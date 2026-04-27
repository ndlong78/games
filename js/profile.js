// ============================================================
// profile.js — Quản lý hồ sơ trẻ em (CRUD + localStorage)
// ============================================================

BBMV.profile = (() => {
  const LS_KEY = 'bbmv_profiles';
  const ACTIVE_PROFILE_KEY = 'bbmv_active_profile_id';
  const DEFAULT_PROFILE_ID = 'default-child';
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
    name: 'Bé',
    avatar: AVATARS[0],
    age: 5,
    eye: 'right',
    createdAt: BBMV.utils.now()
  });

  const buildTemporaryDefaultChildProfile = () => ({
    id: DEFAULT_PROFILE_ID,
    name: 'Bé',
    age: 5,
    ageGroup: '4-7',
    weakEye: 'right',
    createdAt: BBMV.utils.now(),
    sessions: [],
    badges: [],
    settings: {},
    // Trường tương thích để các module cũ không bị vỡ
    avatar: AVATARS[0],
    eye: 'right'
  });

  const normalizeProfile = (raw, idx = 0) => {
    if (!raw || typeof raw !== 'object') return null;

    const safeName = BBMV.utils.sanitizeChildName(raw.name);
    const validName = BBMV.utils.isValidChildName(safeName) ? safeName : `Bé ${idx + 1}`;
    const parsedAge = Number.parseInt(raw.age, 10);
    const age = Number.isFinite(parsedAge) ? BBMV.utils.clamp(parsedAge, 3, 10) : 5;
    const weakEye = ['left', 'right', 'both'].includes(raw.weakEye) ? raw.weakEye : null;
    const eye = ['left', 'right', 'both'].includes(raw.eye) ? raw.eye : (weakEye || 'right');
    const avatar = AVATARS.includes(raw.avatar) ? raw.avatar : AVATARS[0];
    const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
    const id = /^[a-zA-Z0-9_-]{6,64}$/.test(rawId) ? rawId : BBMV.utils.uuid();
    const createdAt = Number.isNaN(new Date(raw.createdAt).getTime()) ? BBMV.utils.now() : raw.createdAt;
    const ageGroup = typeof raw.ageGroup === 'string' && raw.ageGroup
      ? raw.ageGroup
      : (age <= 7 ? '4-7' : '8-12');
    const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
    const badges = Array.isArray(raw.badges) ? raw.badges : [];
    const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};

    return { id, name: validName, avatar, age, eye, weakEye: eye, ageGroup, createdAt, sessions, badges, settings };
  };

  const ensureDefaultProfile = () => {
    const fallbackProfile = buildTemporaryDefaultChildProfile();
    let rawProfiles = null;
    try {
      rawProfiles = BBMV.utils.lsGet(LS_KEY, null, {
        resetOnError: false,
        logError: true,
        logPrefix: '[BBMV][profile]'
      });
    } catch (err) {
      console.error('[BBMV][profile] Unexpected profile storage read error:', err);
    }

    const source = Array.isArray(rawProfiles)
      ? rawProfiles
      : ((rawProfiles && typeof rawProfiles === 'object') ? Object.values(rawProfiles) : []);
    const safeList = source.map((item, idx) => normalizeProfile(item, idx)).filter(Boolean);
    let defaultProfile = safeList.find((p) => p.id === DEFAULT_PROFILE_ID) || null;
    let shouldRewrite = !Array.isArray(rawProfiles);

    if (!defaultProfile) {
      defaultProfile = fallbackProfile;
      safeList.unshift(defaultProfile);
      shouldRewrite = true;
    } else {
      // Đồng bộ schema profile mặc định tạm thời
      const merged = {
        ...fallbackProfile,
        ...defaultProfile,
        id: DEFAULT_PROFILE_ID,
        name: defaultProfile.name || fallbackProfile.name,
        age: Number.isFinite(Number(defaultProfile.age)) ? Number(defaultProfile.age) : fallbackProfile.age,
        ageGroup: defaultProfile.ageGroup || fallbackProfile.ageGroup,
        weakEye: ['left', 'right', 'both'].includes(defaultProfile.weakEye) ? defaultProfile.weakEye : (defaultProfile.eye || 'right'),
        eye: ['left', 'right', 'both'].includes(defaultProfile.eye) ? defaultProfile.eye : (defaultProfile.weakEye || 'right'),
        createdAt: defaultProfile.createdAt || fallbackProfile.createdAt
      };
      if (JSON.stringify(merged) !== JSON.stringify(defaultProfile)) {
        defaultProfile = merged;
        const idx = safeList.findIndex((p) => p.id === DEFAULT_PROFILE_ID);
        safeList[idx] = merged;
        shouldRewrite = true;
      }
    }

    const activeProfile = BBMV.utils.lsGet(ACTIVE_PROFILE_KEY, null);
    if (activeProfile !== DEFAULT_PROFILE_ID) {
      BBMV.utils.lsSet(ACTIVE_PROFILE_KEY, DEFAULT_PROFILE_ID);
      shouldRewrite = true;
    }
    currentProfileId = DEFAULT_PROFILE_ID;

    if (shouldRewrite) {
      BBMV.utils.lsSet(LS_KEY, safeList);
    }
    console.log('[BBMV] Default profile loaded');
    return defaultProfile;
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

  const isValidProfileForPlay = (profile) => {
    if (!profile || typeof profile !== 'object') return false;
    if (typeof profile.id !== 'string' || profile.id.length < 6) return false;
    if (!BBMV.utils.isValidChildName(profile.name)) return false;
    if (!AVATARS.includes(profile.avatar)) return false;
    if (!Number.isFinite(Number(profile.age))) return false;
    if (!['left', 'right', 'both'].includes(profile.eye)) return false;
    return true;
  };

  const getCurrent = () => {
    if (!currentProfileId) {
      const persistedId = BBMV.utils.lsGet(ACTIVE_PROFILE_KEY, null);
      if (typeof persistedId === 'string' && persistedId) currentProfileId = persistedId;
    }
    if (!currentProfileId) return null;
    const profile = getById(currentProfileId);
    if (!profile) {
      BBMV.utils.lsDel(ACTIVE_PROFILE_KEY);
      currentProfileId = null;
    }
    return profile;
  };

  const setCurrent = (id) => {
    currentProfileId = getById(id) ? id : null;
    if (currentProfileId) BBMV.utils.lsSet(ACTIVE_PROFILE_KEY, currentProfileId);
    else BBMV.utils.lsDel(ACTIVE_PROFILE_KEY);
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
    if (currentProfileId === id) {
      currentProfileId = null;
      BBMV.utils.lsDel(ACTIVE_PROFILE_KEY);
    }
    const sessions = BBMV.utils.lsGet('bbmv_sessions', []);
    BBMV.utils.lsSet('bbmv_sessions', sessions.filter(s => s.profileId !== id));
  };

  const selectProfile = (profileId) => {
    try {
      console.log('[BBMV] profile.select', profileId);
      const profile = getById(profileId);
      if (!profile) throw new Error(`Profile not found: ${profileId}`);
      console.log('[BBMV] profile.select profile found', profile.id);

      if (!isValidProfileForPlay(profile)) {
        throw new Error(`Profile invalid fields: ${profile.id}`);
      }

      const selectedId = setCurrent(profile.id);
      if (!selectedId) throw new Error(`Failed to set active profile: ${profile.id}`);
      console.log('[BBMV] profile.select activeProfile saved', selectedId);

      const shown = BBMV.utils.showScreen('menu', { fatalOnMissing: true });
      if (!shown) throw new Error('showScreen(menu) failed');
      console.log('[BBMV] profile.select screen changed', 'menu');

      const rendered = renderMenuScreen();
      if (!rendered) throw new Error('renderMenuScreen() failed');
      console.log('[BBMV] profile.select menu/home rendered');

      BBMV.audio.speak(`Chào ${profile.name}! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!`, true);
      return true;
    } catch (err) {
      console.error('[BBMV] Failed to select profile:', err);
      BBMV.utils.showFatalError(
        'Không thể mở hồ sơ này. Vui lòng kiểm tra dữ liệu hồ sơ hoặc tạo hồ sơ mới.',
        err
      );
      return false;
    }
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
        selectProfile(p.id);
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
        throw new Error('No active profile');
      }
      if (!isValidProfileForPlay(p)) {
        throw new Error(`Active profile has invalid fields: ${p.id || 'unknown'}`);
      }
      const chipAvatar = BBMV.utils.$('chip-avatar');
      const chipName = BBMV.utils.$('chip-name');
      if (!chipAvatar || !chipName) {
        throw new Error('Missing required menu DOM elements: #chip-avatar or #chip-name');
      }
      chipAvatar.textContent = p.avatar;
      chipName.textContent = p.name;

      if (!BBMV.utils.$('screen-menu')) {
        throw new Error('Missing menu screen element: #screen-menu');
      }

      if (!BBMV.gamification || typeof BBMV.gamification.getStreak !== 'function') {
        throw new Error('gamification.getStreak is unavailable');
      }
      const streak = BBMV.gamification.getStreak(p.id);
      const streakEl = BBMV.utils.$('menu-streak');
      if (!streakEl) {
        throw new Error('Missing required menu DOM element: #menu-streak');
      }
      streakEl.textContent = streak > 0 ? `🔥 ${streak} ngày` : `🌟 Chơi thôi!`;
      return true;
    } catch (err) {
      console.error('[BBMV][profile] renderMenuScreen failed:', err);
      if (typeof BBMV.utils.showFatalError === 'function') {
        BBMV.utils.showFatalError('Không thể render màn hình menu từ hồ sơ đã chọn.', err);
      } else {
        BBMV.utils.showFallbackScreen('renderMenuScreen-failed');
      }
      return false;
    }
  };

  const restoreActiveProfile = () => {
    const id = BBMV.utils.lsGet(ACTIVE_PROFILE_KEY, null);
    if (typeof id !== 'string' || !id) return null;
    return setCurrent(id);
  };

  const hideProfileFlowUI = () => {
    const selectors = [
      '#screen-profile',
      '#modal-profile',
      '#add-profile-form',
      '#profile-modal',
      '#profile-overlay',
      '.profile-overlay'
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el) return;
        el.hidden = true;
        el.classList?.add('hidden');
        el.classList?.remove('active');
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.setAttribute('aria-hidden', 'true');
      });
    });
    console.log('[BBMV] Profile screen hidden');
  };

  const clearActiveProfile = () => {
    currentProfileId = null;
    BBMV.utils.lsDel(ACTIVE_PROFILE_KEY);
  };

  const getActiveProfileKey = () => ACTIVE_PROFILE_KEY;

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
      BBMV.utils.showScreen('menu');
      renderMenuScreen();
    });
    const switchBtn = BBMV.utils.$('btn-switch-profile');
    if (switchBtn) switchBtn.textContent = '🏠 Về menu';
    BBMV.utils.$('modal-profile')?.addEventListener('pointerdown', (e) => {
      if (e.target === BBMV.utils.$('modal-profile')) closeModal();
    });
  };

  return {
    getAll, getById, getCurrent, setCurrent, create, update, remove,
    selectProfile, restoreActiveProfile, clearActiveProfile, getActiveProfileKey,
    renderProfilesScreen, renderMenuScreen, openModal, closeModal,
    bindEvents, ensureDefaultProfile, hideProfileFlowUI, AVATARS, EYE_LABEL
  };
})();
