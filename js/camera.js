// ============================================================
// camera.js — Kiểm tra che mắt qua webcam
// ============================================================

BBMV.camera = (() => {
  let stream = null;
  let skipTapCount = 0;
  let skipTapTimer = null;

  // ── Mở webcam ──
  const start = async () => {
    const video = BBMV.utils.$('camera-video');
    const previewWrap = BBMV.utils.$('camera-preview-wrap');

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } },
        audio: false
      });
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      if (previewWrap) previewWrap.style.display = 'block';
    } catch (err) {
      console.error('[BBMV] Camera error:', err);
      if (previewWrap) previewWrap.style.display = 'none';
      handleCameraError(err);
    }
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const video = BBMV.utils.$('camera-video');
    if (video) { video.srcObject = null; }
  };

  const handleCameraError = (err) => {
    let msg = 'Không thể mở camera. ';
    if (err.name === 'NotAllowedError') msg += 'Con ơi, hãy cho phép dùng camera nhé! 📷';
    else if (err.name === 'NotFoundError') msg += 'Không tìm thấy camera trên thiết bị này.';
    else msg += 'Vui lòng kiểm tra lại camera.';

    const stepText = BBMV.utils.$('camera-step-text');
    if (stepText) {
      stepText.textContent = msg;
      stepText.style.color = '#E87878';
    }
  };

  // ── Khởi tạo màn hình camera ──
  const initScreen = (profile) => {
    if (!profile) return;
    const eyeLabel = { left: 'mắt trái', right: 'mắt phải', both: 'hai mắt' };
    const which = eyeLabel[profile.eye] || 'mắt yếu';

    // Cập nhật hướng dẫn
    const stepText = BBMV.utils.$('camera-step-text');
    if (stepText) {
      stepText.textContent = `Con hãy che ${which} bằng miếng dán nhé! 🩹`;
      stepText.style.color = '';
    }

    // Minh họa che mắt
    const eyeCovered = BBMV.utils.$('illus-eye-covered');
    const eyeOpen = BBMV.utils.$('illus-eye-open');
    if (eyeCovered && eyeOpen) {
      if (profile.eye === 'right') {
        eyeOpen.style.order = '-1'; // Mắt trái (mắt tốt) ở bên trái
        eyeCovered.style.order = '1'; // Che mắt phải
      } else {
        eyeOpen.style.order = '1';
        eyeCovered.style.order = '-1';
      }
    }

    skipTapCount = 0;
    clearTimeout(skipTapTimer);

    // Giọng nói
    BBMV.audio.speak(`Con hãy che ${which} bằng miếng dán nhé!`, true);

    // Bắt đầu webcam
    start();
  };

  // ── Đếm ngược ──
  const startCountdown = (onDone) => {
    const cdEl = BBMV.utils.$('camera-countdown');
    if (!cdEl) { onDone(); return; }
    let count = 5;
    cdEl.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        cdEl.textContent = '';
        onDone();
      } else {
        cdEl.textContent = count;
      }
    }, 1000);
  };

  // ── Xác nhận che mắt bởi phụ huynh ──
  const confirm = () => {
    stop();
    BBMV.game._lastEyeCoverConfirmed = true;
    BBMV.audio.sfx.star();
    BBMV.audio.speak('Tuyệt vời! Con che mắt đúng rồi! Bắt đầu chơi thôi!', true);
    BBMV.utils.showToast('✅ Tuyệt vời! Bắt đầu chơi!');
    setTimeout(() => {
      BBMV.utils.showScreen('screen-game');
      BBMV.game.startGame(1, 1);
    }, 1200);
  };

  // ── Bỏ qua (cần double-tap) ──
  const skip = () => {
    skipTapCount++;
    clearTimeout(skipTapTimer);
    if (skipTapCount >= 2) {
      skipTapCount = 0;
      stop();
      BBMV.game._lastEyeCoverConfirmed = false;
      BBMV.utils.showScreen('screen-game');
      BBMV.game.startGame(1, 1);
    } else {
      BBMV.utils.showToast('Nhấn thêm 1 lần nữa để bỏ qua');
      skipTapTimer = setTimeout(() => { skipTapCount = 0; }, 3000);
    }
  };

  // ── Bind events ──
  const bindEvents = () => {
    BBMV.utils.$('btn-confirm-camera')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      confirm();
    });
    BBMV.utils.$('btn-skip-camera')?.addEventListener('pointerdown', () => {
      skip();
    });
  };

  return { initScreen, start, stop, confirm, skip, bindEvents };
})();
