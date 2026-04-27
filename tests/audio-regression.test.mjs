import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const utilsCode = fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8');
const audioCode = fs.readFileSync(new URL('../js/audio.js', import.meta.url), 'utf8');

const createStorage = () => {
  const store = new Map();
  return {
    setItem(k, v) { store.set(String(k), String(v)); },
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    removeItem(k) { store.delete(String(k)); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; }
  };
};

test('audio.speak không crash khi thiếu SpeechSynthesisUtterance', () => {
  const localStorage = createStorage();
  const sandbox = {
    window: {
      speechSynthesis: {
        cancel() {},
        getVoices: () => [],
        speak() {
          throw new Error('speak() không được gọi khi thiếu constructor');
        }
      }
    },
    BBMV: undefined,
    localStorage,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, appendChild() {}, querySelector: () => ({}) }),
      head: { appendChild() {} },
      body: { appendChild() {} }
    },
    requestAnimationFrame: (cb) => cb(),
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Object,
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(utilsCode, sandbox);
  sandbox.BBMV = sandbox.window.BBMV;
  vm.runInContext(audioCode, sandbox);

  assert.doesNotThrow(() => {
    sandbox.window.BBMV.audio.speak('Xin chào bé!');
  });
});
