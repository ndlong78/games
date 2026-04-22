// ============================================================
// camera.js — Kiểm tra/xác nhận che mắt qua webcam
// ============================================================

BBMV.camera = (() => {
  let stream = null;
  let skipTapCount = 0;
  let skipTapTimer = null;

  const setEyeCoverState = (confirmed, result) => {
    BBMV.game._lastEyeCoverConfirmed = !!confirmed;
    BBMV.game._lastEyeCoverAIResult = result || (confirmed ? 'confirmed' : 'unknown');
  };

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
      setEyeCoverState(false, 'camera_error');
      handleCameraError(err);
    }
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const video = BBMV.utils.$('camera-video');
    if (video) video.srcObject = null;
  };

  const handleCameraError = (err) => {
    let msg = 'Không thể mở camera. ';
    if (err.name === 'NotAllowedError') msg += 'Phụ huynh hãy cho phép dùng camera nhé! 📷';
    else if (err.name === 'NotFoundError') msg += 'Không tìm thấy camera trên thiết bị này.';
    else msg += 'Vui lòng kiểm tra lại camera.';

    const stepText = BBMV.utils.$('camera-step-text');
    if (stepText) {
      stepText.textContent = `${msg} Bạn vẫn có thể xác nhận thủ công hoặc bỏ qua.`;
      stepText.style.color = '#E87878';
    }
  };

  const initScreen = (profile) => {
    if (!profile) return;
    const eyeLabel = { left: 'mắt trái', right: 'mắt phải', both: 'hai mắt' };
    const which = eyeLabel[profile.eye] || 'mắt yếu';

    setEyeCoverState(false, 'pending');

    const stepText = BBMV.utils.$('camera-step-text');
    if (stepText) {
      stepText.textContent = `Con hãy che ${which} bằng miếng dán nhé! 🩹`;
      stepText.style.color = '';
    }

    const eyeCovered = BBMV.utils.$('illus-eye-covered');
    const eyeOpen = BBMV.utils.$('illus-eye-open');
    if (eyeCovered && eyeOpen) {
      if (profile.eye === 'right') {
        eyeOpen.style.order = '-1';
        eyeCovered.style.order = '1';
      } else {
        eyeOpen.style.order = '1';
        eyeCovered.style.order = '-1';
      }
    }

    skipTapCount = 0;
    clearTimeout(skipTapTimer);

    BBMV.audio.speak(`Con hãy che ${which} bằng miếng dán nhé!`, true);
    start();
  };

  const confirm = () => {
    stop();
    setEyeCoverState(true, 'confirmed');
    BBMV.audio.sfx.star();
    BBMV.audio.speak('Tuyệt vời! Con che mắt đúng rồi! Bắt đầu chơi thôi!', true);
    BBMV.utils.showToast('✅ Tuyệt vời! Bắt đầu chơi!');
    setTimeout(() => {
      BBMV.utils.showScreen('screen-game');
      BBMV.game.startGame(1, 1, { eyeCoverConfirmed: true, eyeCoverAIResult: 'confirmed' });
    }, 1200);
  };

  const skip = () => {
    skipTapCount++;
    clearTimeout(skipTapTimer);
    if (skipTapCount >= 2) {
      skipTapCount = 0;
      stop();
      setEyeCoverState(false, 'skipped');
      BBMV.utils.showScreen('screen-game');
      BBMV.game.startGame(1, 1, { eyeCoverConfirmed: false, eyeCoverAIResult: 'skipped' });
    } else {
      BBMV.utils.showToast('Nhấn thêm 1 lần nữa để bỏ qua');
      skipTapTimer = setTimeout(() => { skipTapCount = 0; }, 3000);
    }
  };

  const bindEvents = () => {
    BBMV.utils.$('btn-confirm-camera')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      confirm();
    });
    BBMV.utils.$('btn-skip-camera')?.addEventListener('pointerdown', () => {
      BBMV.audio.sfx.button();
      skip();
    });
  };

  return { initScreen, start, stop, confirm, skip, bindEvents };
})();
