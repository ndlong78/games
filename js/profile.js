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
  let skipConfirmCount = 0; // double-tap guard cho nút bỏ qua

  // ── Đọc/ghi danh sách profile ──
  const getAll = () => BBMV.utils.lsGet(LS_KEY, []);
  const saveAll = (list) => BBMV.utils.lsSet(LS_KEY, list);

  const getById = (id) => getAll().find(p => p.id === id) || null;

  const getCurrent = () => {
    if (!currentProfileId) return null;
    return getById(currentProfileId);
  };

  const setCurrent = (id) => { currentProfileId = id; };

  // ── CRUD ──
  const create = (name, avatar, age, eye) => {
    const list = getAll();
    const p = {
      id: BBMV.utils.uuid(),
      name: name.trim(),
      avatar,
      age,
      eye,
      createdAt: BBMV.utils.now()
    };
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
    // Xóa dữ liệu session của profile này
    const sessions = BBMV.utils.lsGet('bbmv_sessions', []);
    BBMV.utils.lsSet('bbmv_sessions', sessions.filter(s => s.profileId !== id));
  };

  // ── Render màn hình chọn profile ──
  const renderProfilesScreen = () => {
    const grid = BBMV.utils.$('profiles-grid');
    if (!grid) return;
    const list = getAll();
    grid.innerHTML = '';

    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-mid);font-size:18px;font-weight:700;">
        Chưa có hồ sơ nào.<br/>Hãy thêm hồ sơ cho bé nhé! 😊</div>`;
      return;
    }

    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.innerHTML = `
        <div class="profile-avatar">${p.avatar}</div>
        <div class="profile-name">${p.name}</div>
        <div class="profile-info">${p.age} tuổi · ${EYE_LABEL[p.eye] || ''}</div>
        <button class="profile-delete" data-id="${p.id}" title="Xóa hồ sơ">✕</button>
      `;
      card.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('profile-delete')) return;
        BBMV.audio.resume();
        BBMV.audio.sfx.button();
        setCurrent(p.id);
        renderMenuScreen();
        BBMV.utils.showScreen('screen-menu');
        BBMV.audio.speak(`Chào ${p.name}! Hôm nay chúng ta cùng chơi Bướm Bay Mắt Vui nhé!`, true);
      });
      card.querySelector('.profile-delete').addEventListener('pointerdown', (e) => {
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

  // ── Modal thêm/sửa profile ──
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
    const name = BBMV.utils.$('input-name').value.trim();
    if (!name) {
      BBMV.utils.showToast('Vui lòng nhập tên bé! 😊');
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

  // ── Render menu screen với thông tin profile hiện tại ──
  const renderMenuScreen = () => {
    const p = getCurrent();
    if (!p) return;
    const chipAvatar = BBMV.utils.$('chip-avatar');
    const chipName = BBMV.utils.$('chip-name');
    if (chipAvatar) chipAvatar.textContent = p.avatar;
    if (chipName) chipName.textContent = p.name;

    // Streak
    const streak = BBMV.gamification ? BBMV.gamification.getStreak(p.id) : 0;
    const streakEl = BBMV.utils.$('menu-streak');
    if (streakEl) {
      streakEl.textContent = streak > 0 ? `🔥 ${streak} ngày` : `🌟 Chơi thôi!`;
    }
  };

  // ── Bind sự kiện ──
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
    // Đóng modal khi click ngoài
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
