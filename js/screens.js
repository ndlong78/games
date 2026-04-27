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
    $('result-stats').innerHTML = [
      `Điểm: <b>${result.score}</b>`,
      `Độ chính xác: <b>${result.accuracy}%</b>`,
      `Combo cao nhất: <b>${result.maxCombo}</b>`,
      `Bỏ lỡ: <b>${result.missed}</b>`,
      `Thời lượng: <b>${result.durationSec}s</b>`,
      `Level: <b>${result.level}</b>`
    ].map((row) => `<div>${row}</div>`).join('');
  }

  return { show, updateHUD, showCombo, showResult };
})();
