window.FFV_SCREENS = (() => {
  const $ = (id) => document.getElementById(id);
  let comboTimer;

  function show(screenId) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    $(screenId).classList.add('active');
    $('hud').style.display = screenId === 'screen-game' ? 'flex' : 'none';
  }

  function updateHUD(state) {
    $('hud-score').textContent = state.score;
    $('hud-time').textContent = Math.max(0, Math.ceil(state.timeLeft));
    $('hud-hearts').textContent = Math.max(0, state.hearts);
    $('hud-combo').textContent = `x${state.combo}`;
  }

  function showCombo(text) {
    const banner = $('goal-banner');
    banner.textContent = text;
    banner.classList.remove('hidden');
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => banner.classList.add('hidden'), 900);
  }

  function showResult(result) {
    show('screen-result');
    const stars = result.score > 520 ? '⭐⭐⭐' : result.score > 280 ? '⭐⭐' : '⭐';
    $('result-stars').textContent = stars;
    $('result-title').textContent = 'Hoàn thành rồi!';
    $('result-message').innerHTML = '<b>Con đã chơi rất tốt!</b><br/>Cùng xem thành quả nhé!';
    $('result-stats').innerHTML = [
      `Điểm: <b>${result.score}</b>`,
      `Độ chính xác: <b>${result.accuracy}%</b>`,
      `Số quả đã cắt: <b>${result.fruitsSliced}</b>`,
      `Số quả bỏ lỡ: <b>${result.fruitsMissed}</b>`,
      `Combo cao nhất: <b>${result.maxCombo}</b>`,
      `Thời lượng phiên chơi: <b>${result.durationSeconds}s (2 phút)</b>`,
      `Mức khó cuối: <b>Giai đoạn ${result.finalDifficultyStage}/4</b>`
    ].map((row) => `<div>${row}</div>`).join('');
  }

  return { show, updateHUD, showCombo, showResult };
})();
