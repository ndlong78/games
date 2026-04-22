// ============================================================
// audio.js — Âm thanh: nhạc nền, SFX, giọng nói tiếng Việt
// ============================================================

BBMV.audio = (() => {
  let ctx = null;          // AudioContext
  let masterGain = null;   // Gain tổng
  let musicGain = null;    // Gain nhạc nền
  let sfxGain = null;      // Gain hiệu ứng
  let musicInterval = null;
  let speechQueue = [];
  let speechBusy = false;

  // Khởi tạo AudioContext (cần user gesture trên iOS)
  const init = () => {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain(); masterGain.gain.value = 1;
      musicGain = ctx.createGain(); musicGain.gain.value = 0.25;
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7;
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(ctx.destination);
    } catch(e) {
      console.error('[BBMV] AudioContext init failed:', e);
    }
  };

  // Resume context (iOS yêu cầu resume sau user gesture)
  const resume = () => {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };

  // ── Tạo âm thanh đơn giản bằng oscillator ──
  const playTone = (freq, type, duration, gainVal, delay = 0) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(sfxGain);
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  };

  // ── Sound Effects ──
  const sfx = {
    // Âm vui khi bắt bướm thành công
    catch: () => {
      if (!ctx) return;
      [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.2, 0.5, i * 0.07));
    },
    // Âm nhẹ khi bướm bay mất
    miss: () => {
      if (!ctx) return;
      playTone(300, 'sine', 0.3, 0.3, 0);
      playTone(250, 'sine', 0.3, 0.3, 0.1);
    },
    // Âm lấp lánh khi nhận sao
    star: () => {
      if (!ctx) return;
      const freqs = [880, 1108, 1318, 1760, 2093];
      freqs.forEach((f, i) => playTone(f, 'sine', 0.15, 0.4, i * 0.06));
    },
    // Jingle lên level
    levelup: () => {
      if (!ctx) return;
      const seq = [523, 659, 784, 1047, 1319];
      seq.forEach((f, i) => playTone(f, 'triangle', 0.25, 0.5, i * 0.1));
    },
    // Click nút
    button: () => {
      if (!ctx) return;
      playTone(800, 'sine', 0.1, 0.3, 0);
    },
    // Chuỗi ngày (streak)
    streak: () => {
      if (!ctx) return;
      [440, 550, 660, 880, 1100].forEach((f, i) => playTone(f, 'triangle', 0.2, 0.45, i * 0.08));
    }
  };

  // ── Nhạc nền procedural (giai điệu nhẹ nhàng) ──
  const MELODY = [
    [523, 0.5], [659, 0.5], [784, 0.5], [880, 0.5],
    [784, 0.5], [659, 0.5], [523, 1.0],
    [392, 0.5], [523, 0.5], [659, 0.5], [784, 0.5],
    [659, 1.0], [523, 0.5], [440, 0.5],
    [494, 0.5], [587, 0.5], [698, 0.5], [784, 0.5],
    [698, 0.5], [587, 0.5], [494, 1.0],
    [523, 0.5], [587, 0.5], [659, 0.5], [784, 0.5],
    [1047, 2.0]
  ];

  let melodyIdx = 0;
  let melodyTime = 0;
  let musicPlaying = false;

  const playMusicNote = () => {
    if (!ctx || !musicPlaying) return;
    const [freq, dur] = MELODY[melodyIdx % MELODY.length];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(musicGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.05);
    g.gain.setValueAtTime(0.6, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    melodyIdx++;
    if (melodyIdx % MELODY.length === 0) melodyIdx = 0;
    musicInterval = setTimeout(playMusicNote, dur * 1000);
  };

  const startMusic = () => {
    if (musicPlaying) return;
    musicPlaying = true;
    melodyIdx = 0;
    playMusicNote();
  };

  const stopMusic = () => {
    musicPlaying = false;
    clearTimeout(musicInterval);
  };

  const setMusicVol = (v) => {
    if (musicGain) musicGain.gain.value = v * 0.4;
  };

  const setSfxVol = (v) => {
    if (sfxGain) sfxGain.gain.value = v;
  };

  // ── Web Speech API — Giọng nói tiếng Việt ──
  const speak = (text, priority = false) => {
    if (!window.speechSynthesis) return;
    const settings = BBMV.utils.lsGet('bbmv_settings', {});
    if (settings.voiceEnabled === false) return;

    if (priority) {
      window.speechSynthesis.cancel();
      speechQueue = [];
      speechBusy = false;
    }
    speechQueue.push(text);
    if (!speechBusy) _speakNext();
  };

  const _speakNext = () => {
    if (!speechQueue.length) { speechBusy = false; return; }
    speechBusy = true;
    const text = speechQueue.shift();
    const utt = new SpeechSynthesisUtterance(text);

    // Tìm voice tiếng Việt
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang === 'vi-VN') ||
                    voices.find(v => v.lang.startsWith('vi')) ||
                    voices.find(v => v.name.toLowerCase().includes('female')) ||
                    voices[0];
    if (viVoice) utt.voice = viVoice;
    utt.lang = 'vi-VN';
    utt.rate = 0.85;
    utt.pitch = 1.1;
    utt.volume = 0.95;

    utt.onend = () => {
      speechBusy = false;
      setTimeout(_speakNext, 200);
    };
    utt.onerror = () => {
      speechBusy = false;
      _speakNext();
    };

    // iOS Safari workaround: phải set rate sau khi assign voice
    try {
      window.speechSynthesis.speak(utt);
    } catch(e) {
      speechBusy = false;
    }
  };

  const stopSpeech = () => {
    speechQueue = [];
    speechBusy = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // Preload voices (iOS cần gọi getVoices sớm)
  const preloadVoices = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  };

  return {
    init, resume, sfx,
    startMusic, stopMusic, setMusicVol, setSfxVol,
    speak, stopSpeech, preloadVoices
  };
})();
