window.FFV_REPORT = (() => {
  const cfg = window.FFV_CONFIG;
  const key = cfg.STORAGE_KEYS.reports;

  function save(result) {
    const all = getAll();
    all.unshift(result);
    localStorage.setItem(key, JSON.stringify(all.slice(0, 120)));
  }

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  function getPin() {
    return localStorage.getItem(cfg.STORAGE_KEYS.parentPin) || '1234';
  }

  function setPin(pin) {
    localStorage.setItem(cfg.STORAGE_KEYS.parentPin, pin);
  }

  function render(el) {
    const rows = getAll();
    if (!rows.length) {
      el.innerHTML = '<p>Chưa có dữ liệu chơi.</p>';
      return;
    }
    el.innerHTML = rows.map((r, idx) => `<div style="padding:6px 0;border-bottom:1px dashed #bdd4ec;">
      <b>#${rows.length - idx}</b> — ${new Date(r.date).toLocaleString('vi-VN')}<br>
      Điểm: ${r.score} | Chính xác: ${r.accuracy}% | Bỏ lỡ: ${r.missed}<br>
      Combo max: ${r.maxCombo} | Level: ${r.level} | Thời lượng: ${r.durationSec}s
    </div>`).join('');
  }

  function exportPDF() {
    const rows = getAll();
    const jspdf = window.jspdf;
    if (!jspdf?.jsPDF) {
      alert('Chưa có thư viện PDF trong app hiện tại. Có thể dùng in màn hình thay thế.');
      return;
    }
    const doc = new jspdf.jsPDF();
    doc.setFontSize(14);
    doc.text('Bao cao Hoa Qua Bay Mat Vui', 12, 12);
    rows.slice(0, 20).forEach((r, i) => {
      doc.setFontSize(10);
      doc.text(`${i + 1}) ${r.date} | score ${r.score} | acc ${r.accuracy}% | lv ${r.level}`, 12, 22 + i * 8);
    });
    doc.save('hoa-qua-bay-report.pdf');
  }

  return { save, getAll, getPin, setPin, render, exportPDF };
})();
