// ============================================================
// gamification.js — Huy hiệu, streak, sao tích lũy
// ============================================================

BBMV.gamification = (() => {
  const LS_KEY_BADGES = 'bbmv_badges';
  const LS_KEY_STREAK = 'bbmv_streak';
  const logPrefix = '[BBMV][profile]';
  const safeObject = (value, key) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (value == null) return {};
    console.error(`${logPrefix} Dữ liệu "${key}" không hợp lệ, đã reset về mặc định.`);
    BBMV.utils.lsSet(key, {});
    return {};
  };
  const safeArray = (value, key) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    console.error(`${logPrefix} Dữ liệu "${key}" không hợp lệ, đã reset về mặc định.`);
    BBMV.utils.lsSet(key, []);
    return [];
  };

  // Định nghĩa tất cả huy hiệu
  const BADGE_DEFS = [
    {
      id: 'first_catch',
      icon: '🌟',
      name: 'Ngôi Sao Nhỏ',
      desc: 'Lần đầu bắt được bướm',
      check: (stats) => stats.totalCaught >= 1
    },
    {
      id: 'streak10',
      icon: '🦋',
      name: 'Bướm Vàng',
      desc: 'Bắt 10 bướm liên tiếp không miss',
      check: (stats) => stats.maxCombo >= 10
    },
    {
      id: 'week7',
      icon: '👁️',
      name: 'Mắt Đại Bàng',
      desc: 'Chơi 7 ngày liên tiếp',
      check: (stats) => stats.currentStreak >= 7
    },
    {
      id: 'champion',
      icon: '🏆',
      name: 'Nhà Vô Địch',
      desc: 'Đạt 3 sao tất cả màn Level 4',
      check: (stats) => stats.level4Stars3Count >= 3
    },
    {
      id: 'persistent',
      icon: '💪',
      name: 'Kiên Trì',
      desc: 'Chơi 30 ngày tổng cộng',
      check: (stats) => stats.totalPlayDays >= 30
    },
    {
      id: 'obedient',
      icon: '❤️',
      name: 'Ngoan Ngoãn',
      desc: 'Che mắt đúng 20 lần',
      check: (stats) => stats.eyeCoverCount >= 20
    },
    {
      id: 'speed',
      icon: '⚡',
      name: 'Siêu Tốc',
      desc: 'Bắt 5 bướm trong 10 giây',
      check: (stats) => stats.speedRecord >= 5
    },
    {
      id: 'accuracy',
      icon: '🎯',
      name: 'Chính Xác',
      desc: 'Đạt tỷ lệ theo dõi 90%+ trong 5 màn',
      check: (stats) => stats.highAccuracySessions >= 5
    }
  ];

  // ── Đọc/ghi badge data ──
  const getBadges = (profileId) => {
    const all = safeObject(BBMV.utils.lsGet(LS_KEY_BADGES, {}, { resetOnError: true, logError: true, logPrefix }), LS_KEY_BADGES);
    return all[profileId] || {};
  };

  const saveBadges = (profileId, badges) => {
    const all = safeObject(BBMV.utils.lsGet(LS_KEY_BADGES, {}, { resetOnError: true, logError: true, logPrefix }), LS_KEY_BADGES);
    all[profileId] = badges;
    BBMV.utils.lsSet(LS_KEY_BADGES, all);
  };

  // Kiểm tra và unlock huy hiệu mới — trả về danh sách badge mới unlock
  const checkBadges = (profileId, stats) => {
    const badges = getBadges(profileId);
    const newBadges = [];
    BADGE_DEFS.forEach(b => {
      if (!badges[b.id] && b.check(stats)) {
        badges[b.id] = { unlockedAt: BBMV.utils.now() };
        newBadges.push(b);
      }
    });
    if (newBadges.length) saveBadges(profileId, badges);
    return newBadges;
  };

  // ── Streak ──
  const getStreakData = (profileId) => {
    const all = safeObject(BBMV.utils.lsGet(LS_KEY_STREAK, {}, { resetOnError: true, logError: true, logPrefix }), LS_KEY_STREAK);
    return all[profileId] || { streak: 0, lastPlayDate: null };
  };

  const updateStreak = (profileId) => {
    const all = safeObject(BBMV.utils.lsGet(LS_KEY_STREAK, {}, { resetOnError: true, logError: true, logPrefix }), LS_KEY_STREAK);
    const data = all[profileId] || { streak: 0, lastPlayDate: null };
    const today = BBMV.utils.today();

    if (data.lastPlayDate === today) return data.streak;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    if (data.lastPlayDate === yStr) {
      data.streak += 1;
    } else if (data.lastPlayDate !== today) {
      data.streak = 1;
    }
    data.lastPlayDate = today;
    all[profileId] = data;
    BBMV.utils.lsSet(LS_KEY_STREAK, all);
    return data.streak;
  };

  const getStreak = (profileId) => getStreakData(profileId).streak;

  // ── Tính stats tổng hợp từ sessions ──
  const calcStats = (profileId) => {
    const sessions = safeArray(BBMV.utils.lsGet('bbmv_sessions', [], { resetOnError: true, logError: true, logPrefix }), 'bbmv_sessions');
    const mySessions = sessions.filter(s => s.profileId === profileId);

    const totalCaught = mySessions.reduce((a, s) => a + (s.butterfliesCaught || 0), 0);
    const maxCombo = mySessions.reduce((a, s) => Math.max(a, s.maxCombo || 0), 0);
    const currentStreak = getStreak(profileId);
    const eyeCoverCount = mySessions.filter(s => s.eyeCoverConfirmed).length;
    const highAccuracySessions = mySessions.filter(s => (s.trackingAccuracy || 0) >= 90).length;

    const level4Stars3Count = mySessions.filter(s => s.level === 4 && s.stars === 3).length;

    const playDays = new Set(mySessions.map(s => s.date?.split('T')[0]).filter(Boolean));
    const totalPlayDays = playDays.size;
    const speedRecord = mySessions.reduce((a, s) => Math.max(a, s.speedRecord || 0), 0);

    return {
      totalCaught, maxCombo, currentStreak, eyeCoverCount,
      highAccuracySessions, level4Stars3Count, totalPlayDays,
      speedRecord
    };
  };

  // ── Render màn hình huy hiệu ──
  const renderBadgesScreen = (profileId) => {
    const grid = BBMV.utils.$('badges-grid');
    if (!grid) return;
    const earned = getBadges(profileId);
    grid.innerHTML = '';

    BADGE_DEFS.forEach(b => {
      const unlocked = !!earned[b.id];
      const card = document.createElement('div');
      card.className = 'badge-card' + (unlocked ? '' : ' locked');
      card.innerHTML = `
        <div class="badge-icon">${unlocked ? b.icon : '❓'}</div>
        <div class="badge-name">${unlocked ? b.name : '???'}</div>
        <div class="badge-desc">${unlocked ? b.desc : 'Chưa mở khóa'}</div>
        ${unlocked ? `<div style="font-size:11px;color:var(--text-mid);font-weight:600;margin-top:4px;">
          ${BBMV.utils.formatDate(earned[b.id].unlockedAt)}</div>` : ''}
      `;
      grid.appendChild(card);
    });
  };

  // ── Hiển thị huy hiệu mới unlock ──
  const showNewBadge = (badges) => {
    if (!badges.length) return;
    const b = badges[0];
    const el = BBMV.utils.$('new-badge');
    if (!el) return;
    el.innerHTML = `🎉 Mở khóa huy hiệu mới!<br/>${b.icon} ${b.name}`;
    el.style.display = 'block';
    BBMV.audio.sfx.star();
    BBMV.audio.speak(`Chúc mừng! Con vừa mở khóa huy hiệu ${b.name}!`);
  };

  // ── Bind events ──
  const bindEvents = () => {
    BBMV.utils.$('btn-badges')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      const p = BBMV.profile.getCurrent();
      if (p) renderBadgesScreen(p.id);
      BBMV.utils.showScreen('screen-badges');
    });
    BBMV.utils.$('btn-badges-back')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.showScreen('screen-menu');
    });
  };

  return {
    BADGE_DEFS, getBadges, checkBadges,
    getStreak, updateStreak, calcStats,
    renderBadgesScreen, showNewBadge,
    bindEvents
  };
})();
