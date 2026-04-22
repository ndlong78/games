import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const utilsCode = fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8');

const createStorage = () => {
  const store = new Map();
  return {
    setItem(k, v) { store.set(String(k), String(v)); },
    getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
    removeItem(k) { store.delete(String(k)); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
    clear() { store.clear(); },
    _dump() { return Object.fromEntries(store); }
  };
};

const loadUtils = () => {
  const localStorage = createStorage();
  const sandbox = {
    window: {},
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
  return { utils: sandbox.window.BBMV.utils, localStorage };
};

test('escapeHTML chặn ký tự nguy hiểm', () => {
  const { utils } = loadUtils();
  const raw = '<img src=x onerror="alert(1)">';
  const escaped = utils.escapeHTML(raw);
  assert.equal(escaped.includes('<'), false);
  assert.equal(escaped.includes('>'), false);
  assert.match(escaped, /&lt;img/);
});

test('sanitize + validate child name', () => {
  const { utils } = loadUtils();
  assert.equal(utils.sanitizeChildName('  <b>Bé An</b>  '), 'bBé An/b');
  assert.equal(utils.isValidChildName('Bé A'), true);
  assert.equal(utils.isValidChildName(''), false);
  assert.equal(utils.isValidChildName('x'.repeat(21)), false);
});

test('hashPin ổn định với cùng input', () => {
  const { utils } = loadUtils();
  assert.equal(utils.hashPin('1234'), utils.hashPin('1234'));
  assert.notEqual(utils.hashPin('1234'), utils.hashPin('1235'));
});

test('lsClearByPrefix chỉ xóa key cùng prefix', () => {
  const { utils, localStorage } = loadUtils();
  localStorage.setItem('bbmv_profiles', '[]');
  localStorage.setItem('bbmv_sessions', '[]');
  localStorage.setItem('other_app_key', '1');

  const removed = utils.lsClearByPrefix('bbmv_');
  assert.equal(removed, 2);
  const dump = localStorage._dump();
  assert.deepEqual(Object.keys(dump), ['other_app_key']);
});

test('showScreen không làm trắng app khi id màn hình không tồn tại', () => {
  const localStorage = createStorage();
  const mkClassList = (initial = []) => {
    const set = new Set(initial);
    return {
      add: (...names) => names.forEach((n) => set.add(n)),
      remove: (...names) => names.forEach((n) => set.delete(n)),
      contains: (name) => set.has(name)
    };
  };

  const activeScreen = { id: 'screen-profiles', classList: mkClassList(['screen', 'active']) };
  const otherScreen = { id: 'screen-menu', classList: mkClassList(['screen']) };
  const screens = [activeScreen, otherScreen];

  const sandbox = {
    window: {},
    BBMV: undefined,
    localStorage,
    document: {
      getElementById: (id) => screens.find((s) => s.id === id) || null,
      querySelector: () => null,
      querySelectorAll: (selector) => selector === '.screen' ? screens : [],
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
  const utils = sandbox.window.BBMV.utils;

  const ok = utils.showScreen('screen-not-found');
  assert.equal(ok, false);
  assert.equal(activeScreen.classList.contains('active'), true);
  assert.equal(otherScreen.classList.contains('active'), false);
});
