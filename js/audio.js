// ============================================================
// audio.js — Âm thanh: nhạc nền, SFX, giọng nói tiếng Việt
// ============================================================

BBMV.audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicInterval = null;
  let speechQueue = [];
  let speechBusy = false;

  const init = () => {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain(); masterGain.gain.value = 1;
      musicGain = ctx.createGain(); musicGain.gain.value = 0.25;
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7;
      musicGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(ctx.destination);
      return ctx;
    } catch(e) {
      console.error('[BBMV] AudioContext init failed:', e);
      return null;
    }
  };

  const resume = async () => {
    const audioCtx = init();
    if (!audioCtx) return false;
    try {
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      return audioCtx.state === 'running';
    } catch (e) {
      console.warn('[BBMV] AudioContext resume blocked:', e?.message || e);
      return false;
    }
  };

  const isReady = () => !!ctx && ctx.state === 'running' && !!sfxGain;

  const playTone = (freq, type, duration, gainVal, delay = 0) => {
    if (!isReady()) return;
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

  const sfx = {
    catch: () => {
      if (!isReady()) return;
      [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.2, 0.5, i * 0.07));
    },
    miss: () => {
      if (!isReady()) return;
      playTone(300, 'sine', 0.3, 0.3, 0);
      playTone(250, 'sine', 0.3, 0.3, 0.1);
    },
    star: () => {
      if (!isReady()) return;
      [880, 1108, 1318, 1760, 2093].forEach((f, i) => playTone(f, 'sine', 0.15, 0.4, i * 0.06));
    },
    levelup: () => {
      if (!isReady()) return;
      [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'triangle', 0.25, 0.5, i * 0.1));
    },
    button: () => {
      if (!isReady()) return;
      playTone(800, 'sine', 0.1, 0.3, 0);
    },
    streak: () => {
      if (!isReady()) return;
      [440, 550, 660, 880, 1100].forEach((f, i) => playTone(f, 'triangle', 0.2, 0.45, i * 0.08));
    }
  };

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
  let musicPlaying = false;

  const playMusicNote = () => {
    if (!isReady() || !musicPlaying) return;
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
    melodyIdx = (melodyIdx + 1) % MELODY.length;
    musicInterval = setTimeout(playMusicNote, dur * 1000);
  };

  const startMusic = async () => {
    const ok = await resume();
    if (!ok || musicPlaying) return;
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
    if (typeof window.SpeechSynthesisUtterance !== 'function') {
      // Một số webview/browser cũ có speechSynthesis nhưng thiếu constructor utterance.
      // Không được để crash app khi chuyển màn hình profile -> menu.
      speechQueue = [];
      speechBusy = false;
      return;
    }
    speechBusy = true;
    const text = speechQueue.shift();
    const utt = new window.SpeechSynthesisUtterance(text);

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

  const preloadVoices = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  };

  return {
    init, resume, sfx,
    startMusic, stopMusic, setMusicVol, setSfxVol,
    speak, stopSpeech, preloadVoices, isReady
  };
})();
