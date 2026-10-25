// Fixture-only integration check. Requires jsdom 26.1.0 in a separate tools directory.
// Does not test Apple's login, media licensing, real audio or Android key dispatch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { JSDOM } = await import(pathToFileURL(process.env.AMTV_JSDOM_MODULE));
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://music.apple.com/mx/search', runScripts: 'outside-only', pretendToBeVisual: true
});
const w = dom.window, events = new Map(), calls = [], errors = [];
w.addEventListener('error', e => errors.push(e.error));
w.HTMLElement.prototype.scrollIntoView = function () {};
w.HTMLElement.prototype.getClientRects = function () { return this.hidden ? [] : [{ left: 0, top: 0, width: 100, height: 40 }]; };
const sdk = {
  isAuthorized: false, previewOnly: false, playbackState: 0, storefrontId: 'mx',
  _whenConfigured: Promise.resolve(), shuffleMode: 0, repeatMode: 0,
  async pause() { calls.push('pause'); }, async play() { calls.push('play'); },
  async authorize() { calls.push('authorize'); }, async setQueue(q) { calls.push(q); },
  addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
  removeEventListener(name, fn) { events.get(name)?.delete(fn); },
  api: { async music() { return { data: { data: [] } }; } }
};
const emit = name => [...(events.get(name) || [])].forEach(fn => fn());
w.MusicKit = { getInstance: () => sdk };
w.AmtvNative = { mode() {}, exit() {}, keyboard() {}, playing() {}, status() {}, ready() {} };
w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) });
for (const file of ['music_backend', 'page', 'brand', 'tv_core', 'tv_screens', 'tv_player']) {
  w.eval(readFileSync(new URL('../res/raw/' + file + '.js', import.meta.url), 'utf8'));
}
const T = w.__tv;
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
try {
  const boot = T.boot();
  await tick();
  emit('authReflectionDidComplete');
  await boot;
  assert.match(T.root.textContent, /Sign In/);
  T.key('ok');
  assert.ok(calls.includes('authorize'), 'D-pad OK on Sign In must call the backend');
  sdk.isAuthorized = true;
  emit('authorizationStatusDidChange');
  await tick();
  assert.equal(T.active().name, 'home');
  T.tab('library', true);
  await tick();
  assert.equal(T.active().name, 'library');
  T.tab('settings', true);
  await tick();
  assert.equal(T.active().name, 'settings');
  assert.match(T.active().el.textContent, /Diagnostics/);
  // Real Radio renderer + backend/cache pipeline, with controlled Apple response shapes.
  const originalMusic = sdk.api.music;
  let editorialResponse = {}, stationResponse, editorialError = false, searchCalls = 0;
  const station = { id: 'ra.fixture', type: 'stations', attributes: { name: 'Fixture Radio', isLive: true } };
  const catalog = { results: { stations: { data: [station] } } };
  stationResponse = catalog;
  sdk.api.music = async (path, params) => {
    assert.ok(path.includes('/mx/'), 'Radio must use the account storefront');
    if (path.includes('/groupings/')) {
      if (editorialError) throw new Error('offline');
      return { data: editorialResponse };
    }
    assert.equal(path, '/v1/catalog/mx/search');
    assert.equal(params.types, 'stations');
    searchCalls++;
    return { data: stationResponse };
  };
  T.tab('radio', true);
  await tick();
  const radio = T.active();
  for (const response of [undefined, null, {}, { data: null }, { data: [] }]) {
    editorialResponse = response;
    T.screens.radio(radio);
    await tick();
    assert.match(radio.page.textContent, /Fixture Radio/);
    assert.doesNotMatch(radio.page.textContent, /Couldn't load|Couldn’t load|undefined/);
  }
  const originalPlay = T.play;
  let selected;
  T.play = item => { selected = item; };
  radio.page.querySelector('.card')._onok();
  assert.equal(selected.id, station.id, 'Radio card must route the returned station to playback');
  T.play = originalPlay;
  editorialError = true;
  T.screens.radio(radio);
  await tick();
  assert.match(radio.page.textContent, /Fixture Radio/);
  editorialError = false;
  const children = [{ type: 'editorial-elements', attributes: { name: 'Live stations' },
    relationships: { contents: { data: [station] } } }];
  for (const grouping of [
    { relationships: { tabs: { data: [{ relationships: { children: { data: children } } }] } } },
    { relationships: { children: { data: children } } }
  ]) {
    editorialResponse = { data: [grouping] };
    const before = searchCalls;
    T.screens.radio(radio);
    await tick();
    assert.match(radio.page.textContent, /Live stations/);
    assert.equal(searchCalls, before, 'Valid editorial content must not use fallback');
  }
  editorialResponse = {};
  stationResponse = { results: {} };
  T.screens.radio(radio);
  await tick();
  assert.match(radio.page.textContent, /Radio stations are unavailable/);
  stationResponse = catalog;
  radio.page.querySelector('.btn')._onok();
  await tick();
  assert.match(radio.page.textContent, /Fixture Radio/, 'Try again must replace the cached empty response');
  sdk.api.music = originalMusic;
  T.tab('settings', true);
  await tick();
  // A user can lose authorization while a menu or detail page is active.
  T.menu('Fixture menu', [{ label: 'Fixture action', run() {} }]);
  sdk.isAuthorized = false;
  emit('authorizationStatusDidChange');
  await tick();
  assert.ok(calls.includes('pause'));
  assert.match(T.root.textContent, /Sign In/);
  assert.equal(T.active(), null);
  assert.ok(!T.root.querySelector('.modal.on, .layer.on'), 'Account controls must not remain over Sign In');
  T.key('ok');
  assert.equal(calls.filter(x => x === 'authorize').length, 2, 'Sign-in focus restored after expiry');
  sdk.isAuthorized = true;
  emit('authorizationStatusDidChange');
  await tick();
  assert.equal(T.active().name, 'home');
  sdk.previewOnly = true;
  emit('playbackStateDidChange');
  await tick();
  assert.match(T.root.textContent, /Sign In/);
  assert.equal(T.active(), null);
  assert.equal(errors.length, 0, errors.map(String).join('\n'));
  console.log('UI fixture integration passed: sign-in OK, home/library/settings, expired session, reauthorization, preview-only state; Radio response variants, regional fallback, station selection and retry');
} finally {
  T.destroy();
  dom.window.close();
}
