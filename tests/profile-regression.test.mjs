import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const utilsCode = fs.readFileSync(new URL('../js/utils.js', import.meta.url), 'utf8');
const profileCode = fs.readFileSync(new URL('../js/profile.js', import.meta.url), 'utf8');

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

const loadProfileModule = (seedProfiles) => {
  const localStorage = createStorage();
  if (seedProfiles !== undefined) localStorage.setItem('bbmv_profiles', JSON.stringify(seedProfiles));

  const sandbox = {
    window: {},
    BBMV: undefined,
    localStorage,
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ className: '', innerHTML: '', addEventListener() {}, querySelector: () => ({ addEventListener() {} }) })
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
  sandbox.BBMV.audio = { sfx: { button() {} }, speak() {} };
  sandbox.BBMV.gamification = { getStreak: () => 0 };

  vm.runInContext(profileCode, sandbox);

  return { profile: sandbox.window.BBMV.profile, localStorage };
};

test('migrate profile data cũ/object sang list hợp lệ', () => {
  const legacyData = {
    first: { name: '<b>Nam</b>', age: '11', eye: 'unknown', avatar: 'invalid' },
    second: null
  };
  const { profile, localStorage } = loadProfileModule(legacyData);

  const list = profile.getAll();
  assert.equal(Array.isArray(list), true);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'bNam/b');
  assert.equal(list[0].age, 10);
  assert.equal(list[0].eye, 'right');

  const migrated = JSON.parse(localStorage.getItem('bbmv_profiles'));
  assert.equal(Array.isArray(migrated), true);
  assert.equal(migrated.length, 1);
});

test('setCurrent không giữ id không tồn tại', () => {
  const { profile } = loadProfileModule([{ id: 'p1', name: 'An', avatar: '🐣', age: 5, eye: 'right' }]);

  assert.equal(profile.setCurrent('missing'), null);
  assert.equal(profile.getCurrent(), null);

  assert.equal(profile.setCurrent('p1'), 'p1');
  assert.equal(profile.getCurrent()?.id, 'p1');
});
