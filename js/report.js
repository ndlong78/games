// ============================================================
// report.js — Lưu session, báo cáo Chart.js, xuất PDF
// ============================================================

BBMV.report = (() => {
  const LS_KEY = 'bbmv_sessions';
  let pinBuffer = '';
  let chartInstances = {};
  let pinFailCount = 0;
  let pinLockUntil = 0;
  let tabsBound = false;

  const isValidSession = (s) => !!(
    s &&
    typeof s.profileId === 'string' && s.profileId.length > 0 &&
    typeof s.date === 'string' && !Number.isNaN(Date.parse(s.date)) &&
    Number.isFinite(Number(s.level ?? 0)) &&
    Number.isFinite(Number(s.stars ?? 0))
  );

  const normalizeSession = (s) => ({
    profileId: String(s.profileId),
    date: new Date(s.date).toISOString(),
    level: Math.max(1, Number(s.level || 1)),
    wave: Math.max(1, Number(s.wave || 1)),
    stars: BBMV.utils.clamp(Number(s.stars || 0), 0, 3),
    durationSeconds: Math.max(0, Number(s.durationSeconds || 0)),
    butterfliesCaught: Math.max(0, Number(s.butterfliesCaught || 0)),
    butterfliesMissed: Math.max(0, Number(s.butterfliesMissed || 0)),
    butterfliesTotal: Math.max(0, Number(s.butterfliesTotal || 0)),
    trackingAccuracy: BBMV.utils.clamp(Number(s.trackingAccuracy || 0), 0, 100),
    maxCombo: Math.max(0, Number(s.maxCombo || 0)),
    speedRecord: Math.max(0, Number(s.speedRecord || 0)),
    eyeCoverConfirmed: !!s.eyeCoverConfirmed,
    eyeCoverAIResult: String(s.eyeCoverAIResult || 'unknown')
  });

  const saveSession = (session) => {
    const sessions = BBMV.utils.lsGet(LS_KEY, []);
    if (!isValidSession(session)) return;
    sessions.push(normalizeSession(session));
    if (sessions.length > 365) sessions.splice(0, sessions.length - 365);
    BBMV.utils.lsSet(LS_KEY, sessions);
  };

  const getSessions = (profileId) => {
    return BBMV.utils.lsGet(LS_KEY, [])
      .filter(isValidSession)
      .map(normalizeSession)
      .filter(s => s.profileId === profileId);
  };

  const initPinPad = () => {
    const pad = BBMV.utils.$('pin-pad');
    if (!pad) return;
    pad.innerHTML = '';
    pinBuffer = '';
    updatePinDisplay();

    const nums = [1,2,3,4,5,6,7,8,9,'',0,'⌫'];
    nums.forEach(n => {
      const btn = document.createElement('button');
      btn.className = 'pin-btn' + (n === '⌫' ? ' pin-del' : '');
      btn.textContent = n === '' ? '' : n;
      if (n === '') { btn.style.visibility = 'hidden'; pad.appendChild(btn); return; }
      btn.addEventListener('pointerdown', () => {
        BBMV.audio.sfx.button();
        if (n === '⌫') pinBuffer = pinBuffer.slice(0, -1);
        else if (pinBuffer.length < 4) pinBuffer += n;
        updatePinDisplay();
        if (pinBuffer.length === 4) checkPin();
      });
      pad.appendChild(btn);
    });
  };

  const updatePinDisplay = () => {
    for (let i = 0; i < 4; i++) {
      const d = BBMV.utils.$(`d${i}`);
      if (d) d.className = 'pin-dot' + (i < pinBuffer.length ? ' filled' : '');
    }
  };

  const checkPin = () => {
    const now = Date.now();
    if (pinLockUntil > now) {
      const waitSec = Math.ceil((pinLockUntil - now) / 1000);
      BBMV.utils.showToast(`🔒 Tạm khóa ${waitSec}s do nhập sai nhiều lần`);
      return;
    }

    const s = BBMV.settings.get();
    if (BBMV.utils.hashPin(pinBuffer) === s.reportPasswordHash) {
      pinFailCount = 0;
      BBMV.utils.$('report-locked').style.display = 'none';
      BBMV.utils.$('report-content').classList.remove('hidden');
      renderReportContent('overview');
      bindReportTabs();
    } else {
      pinFailCount++;
      if (pinFailCount >= 5) {
        pinLockUntil = now + 30000;
        pinFailCount = 0;
      }
      pinBuffer = '';
      updatePinDisplay();
      BBMV.utils.showToast('Mật khẩu không đúng! Thử lại nhé 🔒');
      const pinEl = BBMV.utils.$('pin-display');
      if (pinEl) {
        pinEl.style.animation = 'none';
        pinEl.style.transform = 'translateX(10px)';
        setTimeout(() => { pinEl.style.transform = ''; }, 200);
      }
    }
  };

  const bindReportTabs = () => {
    if (tabsBound) return;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('pointerdown', () => {
        BBMV.audio.sfx.button();
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderReportContent(btn.dataset.tab);
      });
    });
    tabsBound = true;
  };

  const renderReportContent = async (tab) => {
    const body = BBMV.utils.$('report-body');
    if (!body) return;

    const profile = BBMV.profile.getCurrent();
    if (!profile) { body.innerHTML = '<p>Vui lòng chọn hồ sơ trước.</p>'; return; }

    const sessions = getSessions(profile.id);

    Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
    chartInstances = {};

    if (tab === 'overview') renderOverview(body, sessions, profile);
    else if (tab === 'chart7') await renderChart(body, sessions, 7, 'Biểu đồ 7 ngày');
    else if (tab === 'chart30') await renderChart(body, sessions, 30, 'Biểu đồ 30 ngày');
    else if (tab === 'compliance') renderCompliance(body, sessions);
    else if (tab === 'history') renderHistory(body, sessions);
  };

  const renderOverview = (body, sessions, profile) => {
    const totalTime = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
    const totalStars = sessions.reduce((a, s) => a + (s.stars || 0), 0);
    const coverCount = sessions.filter(s => s.eyeCoverConfirmed).length;
    const coverRate = sessions.length > 0 ? Math.round(coverCount / sessions.length * 100) : 0;
    const streak = BBMV.gamification.getStreak(profile.id);
    const avgAcc = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.trackingAccuracy || 0), 0) / sessions.length) : 0;

    const hh = Math.floor(totalTime / 3600);
    const mm = Math.floor((totalTime % 3600) / 60);
    const timeStr = hh > 0 ? `${hh}g ${mm}p` : `${mm} phút`;

    body.innerHTML = `
      <div class="report-overview-grid">
        <div class="overview-card"><div class="overview-icon">🔥</div><div class="overview-value">${streak}</div><div class="overview-label">Ngày liên tiếp</div></div>
        <div class="overview-card"><div class="overview-icon">⏱</div><div class="overview-value">${timeStr}</div><div class="overview-label">Tổng thời gian</div></div>
        <div class="overview-card"><div class="overview-icon">⭐</div><div class="overview-value">${totalStars}</div><div class="overview-label">Tổng sao</div></div>
        <div class="overview-card"><div class="overview-icon">👁️</div><div class="overview-value">${coverRate}%</div><div class="overview-label">Tuân thủ che mắt</div></div>
        <div class="overview-card"><div class="overview-icon">🎯</div><div class="overview-value">${avgAcc}%</div><div class="overview-label">Độ chính xác TB</div></div>
        <div class="overview-card"><div class="overview-icon">📅</div><div class="overview-value">${sessions.length}</div><div class="overview-label">Số lần chơi</div></div>
      </div>
      <div class="chart-container">
        <div class="chart-title">📊 Tiến độ 7 ngày gần nhất</div>
        <canvas id="mini-chart" height="160"></canvas>
      </div>`;

    _loadChartJS(() => {
      const ctx7 = BBMV.utils.$('mini-chart');
      if (!ctx7) return;
      const last7 = _getLast7Data(sessions);
      chartInstances.mini = new Chart(ctx7, {
        type: 'bar',
        data: {
          labels: last7.labels,
          datasets: [{
            label: 'Thời gian (phút)',
            data: last7.minutes,
            backgroundColor: 'rgba(189,234,245,0.8)',
            borderColor: '#5BC4E8',
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    });
  };

  const renderChart = async (body, sessions, days, title) => {
    body.innerHTML = `
      <div class="chart-container"><div class="chart-title">${title}</div><canvas id="chart-main" height="200"></canvas></div>
      <div class="chart-container"><div class="chart-title">🎯 Độ chính xác theo dõi</div><canvas id="chart-acc" height="180"></canvas></div>`;

    _loadChartJS(() => {
      const data = _getDataForDays(sessions, days);
      const ctxMain = BBMV.utils.$('chart-main');
      if (ctxMain) {
        chartInstances.main = new Chart(ctxMain, {
          type: 'bar',
          data: {
            labels: data.labels,
            datasets: [
              { label: 'Thời gian (phút)', data: data.minutes, backgroundColor: 'rgba(197,232,176,0.7)', borderColor: '#6BC95A', borderWidth: 2, borderRadius: 6 },
              { label: 'Sao ⭐', data: data.stars, backgroundColor: 'rgba(255,224,102,0.7)', borderColor: '#FFB800', borderWidth: 2, borderRadius: 6, yAxisID: 'y1' }
            ]
          },
          options: { responsive: true }
        });
      }

      const ctxAcc = BBMV.utils.$('chart-acc');
      if (ctxAcc) {
        chartInstances.acc = new Chart(ctxAcc, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [{ label: 'Độ chính xác (%)', data: data.accuracy, borderColor: '#FF9EB5', backgroundColor: 'rgba(255,158,181,0.1)', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#FF9EB5', tension: 0.4, fill: true }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
        });
      }
    });
  };

  const renderCompliance = (body, sessions) => {
    const total = sessions.length;
    const covered = sessions.filter(s => s.eyeCoverConfirmed).length;
    const skipped = sessions.filter(s => s.eyeCoverAIResult === 'skipped').length;
    const manual = sessions.filter(s => s.eyeCoverAIResult === 'confirmed' || s.eyeCoverAIResult === 'manual_confirmed').length;
    const errors = sessions.filter(s => s.eyeCoverAIResult === 'camera_error').length;
    const pct = total > 0 ? Math.round(covered / total * 100) : 0;

    body.innerHTML = `
      <div class="chart-container">
        <div class="chart-title">👁️ Tuân thủ che mắt</div>
        <canvas id="chart-pie" height="200" style="max-height:200px;"></canvas>
      </div>
      <div style="background:rgba(255,255,255,0.85);border-radius:var(--radius);padding:20px;margin-bottom:16px;">
        <div style="font-family:var(--font-title);font-size:48px;text-align:center;font-weight:800;color:var(--text-dark);">${pct}%</div>
        <div style="text-align:center;color:var(--text-mid);font-weight:700;">tỷ lệ che mắt đúng</div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-mid);font-weight:600;">
          ✅ Che mắt đúng: ${covered}/${total} lần<br/>
          👨‍👩‍👧 Xác nhận thủ công: ${manual} lần<br/>
          ⏭️ Bỏ qua: ${skipped} lần<br/>
          ⚠️ Lỗi camera: ${errors} lần
        </div>
      </div>`;

    _loadChartJS(() => {
      const ctxPie = BBMV.utils.$('chart-pie');
      if (!ctxPie) return;
      chartInstances.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: ['Che mắt đúng ✅', 'Bỏ qua ⏭️'],
          datasets: [{ data: [covered, Math.max(0, total - covered)], backgroundColor: ['#C5E8B0', '#FFD6E0'], borderColor: ['#6BC95A', '#FF9EB5'], borderWidth: 2 }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    });
  };

  const renderHistory = (body, sessions) => {
    const sorted = [...sessions].reverse().slice(0, 50);
    if (!sorted.length) {
      body.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-mid);font-weight:700;">Chưa có lịch sử chơi nào.</div>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;';
    const table = document.createElement('table');
    table.className = 'history-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Ngày</th><th>Level</th><th>Sao</th><th>Bắt</th><th>Chính xác</th><th>Mắt</th></tr>';
    const tbody = document.createElement('tbody');

    sorted.forEach(s => {
      const tr = document.createElement('tr');
      const cells = [
        BBMV.utils.formatDate(s.date),
        `Level ${Number(s.level || 1)}`,
        '⭐'.repeat(Number(s.stars || 0)),
        `${Number(s.butterfliesCaught || 0)}/${Number(s.butterfliesTotal || 0)}`,
        `${Number(s.trackingAccuracy || 0)}%`,
        s.eyeCoverConfirmed ? '✅' : '⏭️'
      ];
      cells.forEach(text => {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    body.innerHTML = '';
    body.appendChild(wrapper);
  };

  const _getLast7Data = (sessions) => {
    const result = { labels: [], minutes: [] };
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.date?.startsWith(dateStr));
      const mins = Math.round(daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60);
      result.labels.push(d.toLocaleDateString('vi-VN', { weekday: 'short', month: 'numeric', day: 'numeric' }));
      result.minutes.push(mins);
    }
    return result;
  };

  const _getDataForDays = (sessions, days) => {
    const result = { labels: [], minutes: [], stars: [], accuracy: [] };
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.date?.startsWith(dateStr));
      const mins = Math.round(daySessions.reduce((a, s) => a + (s.durationSeconds || 0), 0) / 60);
      const stars = daySessions.reduce((a, s) => a + (s.stars || 0), 0);
      const acc = daySessions.length > 0 ? Math.round(daySessions.reduce((a, s) => a + (s.trackingAccuracy || 0), 0) / daySessions.length) : 0;
      result.labels.push(d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }));
      result.minutes.push(mins);
      result.stars.push(stars);
      result.accuracy.push(acc);
    }
    return result;
  };

  const _loadChartJS = (cb) => {
    if (window.Chart) { cb(); return; }
    BBMV.utils.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js')
      .then(cb).catch(e => console.error('[BBMV] Chart.js load failed:', e));
  };

  const exportPDF = async () => {
    const profile = BBMV.profile.getCurrent();
    if (!profile) { BBMV.utils.showToast('Vui lòng chọn hồ sơ trước!'); return; }

    BBMV.utils.showToast('📄 Đang tạo PDF...');
    try {
      await BBMV.utils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const sessions = getSessions(profile.id);
      const W = doc.internal.pageSize.getWidth();

      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('BAO CAO TIEN BO TAP NHUOC THI', W/2, 20, { align: 'center' });
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text('Buom Bay Mat Vui - Ung dung tap luyen nhuoc thi tre em', W/2, 28, { align: 'center' });
      doc.setDrawColor(189, 234, 245); doc.setLineWidth(0.8); doc.line(15, 32, W-15, 32);

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('THONG TIN TRE', 15, 42);
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text(`Ten be: ${profile.name}`, 15, 50);
      doc.text(`Tuoi: ${profile.age} tuoi`, 15, 57);
      const eyeMap = { left: 'Mat trai', right: 'Mat phai', both: 'Ca hai mat' };
      doc.text(`Mat yeu: ${eyeMap[profile.eye] || profile.eye}`, 15, 64);
      doc.text(`Ngay tao bao cao: ${BBMV.utils.formatDate(BBMV.utils.now())}`, 15, 71);

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('THONG KE TONG HOP', 15, 84);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      const totalTime = sessions.reduce((a, s) => a + (s.durationSeconds || 0), 0);
      const totalStars = sessions.reduce((a, s) => a + (s.stars || 0), 0);
      const coverRate = sessions.length > 0 ? Math.round(sessions.filter(s => s.eyeCoverConfirmed).length / sessions.length * 100) : 0;
      const avgAcc = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.trackingAccuracy || 0), 0) / sessions.length) : 0;
      const stats = [
        [`Tong so lan choi: ${sessions.length}`, `Tong thoi gian: ${Math.floor(totalTime/60)} phut`],
        [`Tong sao: ${totalStars}`, `Ty le che mat: ${coverRate}%`],
        [`Do chinh xac TB: ${avgAcc}%`, `Streak: ${BBMV.gamification.getStreak(profile.id)} ngay`]
      ];
      stats.forEach(([l, r], i) => { doc.text(l, 15, 92 + i * 8); doc.text(r, W/2, 92 + i * 8); });

      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('LICH SU 30 NGAY GAN NHAT', 15, 122);
      const recent30 = sessions.slice(-30).reverse();
      if (recent30.length > 0) {
        const tableBody = recent30.map(s => [BBMV.utils.formatDate(s.date), `Level ${s.level}`, `${s.stars || 0} sao`, `${s.butterfliesCaught}/${s.butterfliesTotal}`, `${s.trackingAccuracy || 0}%`, s.eyeCoverConfirmed ? 'Co' : 'Khong']);
        let y = 130;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const headers = ['Ngay', 'Level', 'Sao', 'Bat duoc', 'Chinh xac', 'Che mat'];
        const colX = [15, 38, 57, 75, 100, 125];
        headers.forEach((h, i) => doc.text(h, colX[i], y));
        doc.setFont('helvetica', 'normal');
        tableBody.slice(0, 20).forEach((row, ri) => {
          y += 7; if (y > 270) return;
          if (ri % 2 === 0) { doc.setFillColor(240, 248, 255); doc.rect(14, y-4, W-28, 6, 'F'); }
          row.forEach((cell, ci) => doc.text(String(cell), colX[ci], y));
        });
      }

      const noteY = Math.min(270, 210);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('GHI CHU BAC SI:', 15, noteY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setDrawColor(200, 200, 200);
      for (let i = 0; i < 4; i++) doc.line(15, noteY + 8 + i * 9, W-15, noteY + 8 + i * 9);

      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`Tao boi Buom Bay Mat Vui | ${BBMV.utils.formatDate(BBMV.utils.now())}`, W/2, 290, { align: 'center' });

      const safeName = BBMV.utils.sanitizeChildName(profile.name || 'be');
      doc.save(`BaoCao_${safeName || 'be'}_${BBMV.utils.today()}.pdf`);
      BBMV.utils.showToast('✅ Đã xuất PDF thành công!');
    } catch(e) {
      console.error('[BBMV] PDF export error:', e);
      BBMV.utils.showToast('Lỗi xuất PDF. Vui lòng thử lại!');
    }
  };

  const sanitizeProfiles = (profiles) => Array.isArray(profiles)
    ? profiles.filter(p => p && typeof p.id === 'string').map(p => ({
        id: String(p.id),
        name: BBMV.utils.sanitizeChildName(p.name || 'Bé yêu') || 'Bé yêu',
        avatar: typeof p.avatar === 'string' ? p.avatar : '🐣',
        age: Math.max(3, Math.min(10, Number(p.age || 5))),
        eye: ['left', 'right', 'both'].includes(p.eye) ? p.eye : 'right',
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : BBMV.utils.now()
      }))
    : [];

  const backup = () => {
    const data = {
      version: '2.1',
      exportedAt: BBMV.utils.now(),
      profiles: BBMV.utils.lsGet('bbmv_profiles', []),
      sessions: BBMV.utils.lsGet('bbmv_sessions', []),
      badges: BBMV.utils.lsGet('bbmv_badges', {}),
      streak: BBMV.utils.lsGet('bbmv_streak', {}),
      settings: BBMV.utils.lsGet('bbmv_settings', {})
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BBMV_backup_${BBMV.utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    BBMV.utils.showToast('💾 Đã sao lưu dữ liệu!');
  };

  const restore = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || !data.version) throw new Error('Invalid backup file');

        const profiles = sanitizeProfiles(data.profiles);
        const sessions = Array.isArray(data.sessions) ? data.sessions.filter(isValidSession).map(normalizeSession).slice(-365) : [];
        const badges = data.badges && typeof data.badges === 'object' ? data.badges : {};
        const streak = data.streak && typeof data.streak === 'object' ? data.streak : {};
        const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};

        BBMV.utils.lsSet('bbmv_profiles', profiles);
        BBMV.utils.lsSet('bbmv_sessions', sessions);
        BBMV.utils.lsSet('bbmv_badges', badges);
        BBMV.utils.lsSet('bbmv_streak', streak);
        BBMV.utils.lsSet('bbmv_settings', settings);
        BBMV.utils.showToast('✅ Đã nhập dữ liệu thành công!');
        BBMV.profile.renderProfilesScreen();
      } catch(err) {
        console.error('[BBMV] restore error:', err);
        BBMV.utils.showToast('❌ File không hợp lệ!');
      }
    };
    reader.readAsText(file);
  };

  const bindEvents = () => {
    BBMV.utils.$('btn-menu-report')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.$('report-locked').style.display = '';
      BBMV.utils.$('report-content').classList.add('hidden');
      initPinPad();
      tabsBound = false;
      document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
      BBMV.utils.showScreen('screen-report');
    });
    BBMV.utils.$('btn-report-back')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      BBMV.utils.showScreen('screen-menu');
    });
    BBMV.utils.$('btn-export-pdf')?.addEventListener('pointerdown', () => { BBMV.audio.sfx.button(); exportPDF(); });
    BBMV.utils.$('btn-backup')?.addEventListener('pointerdown', () => { BBMV.audio.sfx.button(); backup(); });
    BBMV.utils.$('btn-restore')?.addEventListener('pointerdown', () => { BBMV.audio.sfx.button(); BBMV.utils.$('input-restore').click(); });
    BBMV.utils.$('input-restore')?.addEventListener('change', (e) => {
      if (e.target.files[0]) restore(e.target.files[0]);
    });
  };

  return { saveSession, getSessions, exportPDF, backup, restore, bindEvents };
})();
