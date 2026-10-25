import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../res/raw/music_backend.js', import.meta.url), 'utf8');
function fixture() {
  const calls = [], listeners = new Map(), intervals = new Set();
  const storage = { 'amtv.api.library': 'personal-data', 'amtv.search': '["query"]', 'amtv.lang': 'en' };
  Object.defineProperty(storage, 'removeItem', { value(key) { delete this[key]; } });
  const sdk = {
    isAuthorized: true, previewOnly: false, storefrontId: 'mx', playbackState: 2,
    developerToken: 'fixture-developer-token', musicUserToken: 'fixture-user-token',
    _whenConfigured: Promise.resolve(),
    api: { async music(...args) { calls.push(['request', ...args]); return { data: { data: [{ id: 'fixture' }] } }; } },
    addEventListener(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); },
    removeEventListener(event, fn) { listeners.get(event)?.delete(fn); }
  };
  for (const name of ['setQueue', 'play', 'pause', 'playNext', 'playLater', 'skipToNextItem', 'skipToPreviousItem', 'seekToTime', 'authorize', 'unauthorize']) {
    sdk[name] = async (...args) => { calls.push([name, ...args]); };
  }
  const context = { window: { MusicKit: { getInstance: () => sdk } }, URL, localStorage: storage,
    setTimeout, clearTimeout,
    setInterval(fn) { intervals.add(fn); return fn; }, clearInterval(fn) { intervals.delete(fn); },
    document: { createElement: () => ({ canPlayType: () => 'probably' }) }, navigator: {},
    async fetch(url, options) { calls.push(['fetch', String(url), options]); return { ok: true, status: 204 }; }
  };
  vm.runInNewContext(source, context);
  const emit = event => [...(listeners.get(event) || [])].forEach(fn => fn());
  return { backend: context.window.__amtvBackend, sdk, context, calls, storage, intervals, listeners, emit };
}

test('backend waits for SDK and exposes no credentials', () => {
  const f = fixture();
  assert.equal(f.backend.ready, true);
  assert.equal(f.backend.developerToken, undefined);
  assert.equal(f.backend.musicUserToken, undefined);
  assert.equal(f.backend.storefrontId, 'mx');
  f.context.window.MusicKit = undefined;
  assert.equal(f.backend.ready, false);
});

test('authorized queues preserve selected track and order', async () => {
  const f = fixture(), queue = { songs: ['a', 'b', 'c'], startWith: 1, startPlaying: true };
  await f.backend.setQueue(queue);
  await f.backend.play();
  assert.deepEqual(f.calls, [['setQueue', queue], ['play']]);
});

for (const state of ['signed out', 'previews only']) {
  test(`${state} blocks every operation that can start playback`, async () => {
    const f = fixture();
    f.sdk.isAuthorized = state !== 'signed out';
    f.sdk.previewOnly = state === 'previews only';
    for (const method of ['play', 'setQueue', 'playNext', 'playLater', 'skipToNextItem', 'skipToPreviousItem', 'seekToTime']) {
      await assert.rejects(f.backend[method](0), /SIGN_IN_REQUIRED/);
    }
    assert.equal(f.calls.length, 0);
    await f.backend.pause();
    assert.equal(f.calls[0][0], 'pause');
  });
}

test('session loss pauses once, handles reentry, then permits reauthorization', async () => {
  const f = fixture();
  let prompts = 0;
  f.sdk.pause = async () => { f.calls.push(['pause']); f.emit('playbackStateDidChange'); };
  const stop = f.backend.watchSession(() => prompts++);
  f.sdk.isAuthorized = false;
  f.emit('authorizationStatusDidChange');
  f.emit('playbackStateDidChange');
  assert.equal(prompts, 1);
  assert.equal(f.calls.length, 1);
  f.sdk.isAuthorized = true;
  f.emit('authorizationStatusDidChange');
  await f.backend.play();
  f.sdk.previewOnly = true;
  for (const fn of f.intervals) fn();
  assert.equal(prompts, 2);
  stop();
  assert.equal(f.intervals.size, 0);
  assert.equal([...f.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
});

test('sign out clears personal cache and history even when revocation fails', async () => {
  const f = fixture();
  f.sdk.unauthorize = async () => { throw new Error('offline'); };
  await assert.rejects(f.backend.unauthorize(), /offline/);
  assert.equal(f.storage['amtv.api.library'], undefined);
  assert.equal(f.storage['amtv.search'], undefined);
  assert.equal(f.storage['amtv.lang'], 'en');
  assert.equal(f.calls[0][0], 'pause');
});

test('library pagination and writes use only the approved Apple API origin', async () => {
  const f = fixture();
  const result = await f.backend.request('/v1/me/library/playlists?offset=100');
  assert.equal(result.data[0].id, 'fixture');
  await f.backend.send('POST', '/v1/me/library', { 'ids[songs]': '123' });
  const call = f.calls[1];
  assert.equal(call[1], 'https://amp-api.music.apple.com/v1/me/library?ids%5Bsongs%5D=123');
  assert.equal(call[2].redirect, 'error');
  assert.equal(call[2].headers['Music-User-Token'], 'fixture-user-token');
});

test('untrusted pagination and malformed API paths cannot leak tokens', async () => {
  const f = fixture();
  for (const path of ['https://evil.test/v1/me', '//evil.test/v1/me', '/v1/../../other', '/v1/\\evil.test', 'javascript:alert(1)', null]) {
    await assert.rejects(f.backend.send('GET', path), /INVALID_API_PATH/);
    await assert.rejects(f.backend.request(path), /INVALID_API_PATH/);
  }
  await assert.rejects(f.backend.send('PATCH', '/v1/me/library'), /INVALID_API_METHOD/);
  assert.equal(f.calls.length, 0);
});

test('signed-out API mutations and invalid seeks are rejected', async () => {
  const f = fixture();
  f.sdk.isAuthorized = false;
  await assert.rejects(f.backend.send('POST', '/v1/me/library'), /SIGN_IN_REQUIRED/);
  f.sdk.isAuthorized = true;
  for (const time of [-1, NaN, Infinity, '12']) await assert.rejects(f.backend.seekToTime(time), /INVALID_SEEK/);
  await f.backend.seekToTime(120);
  assert.deepEqual(f.calls, [['seekToTime', 120]]);
});

test('EME capability success never claims a license or full-song playback', async () => {
  const f = fixture();
  f.context.navigator.requestMediaKeySystemAccess = async () => ({});
  const d = await f.backend.diagnostics();
  assert.equal(d.fullPlaybackVerified, false);
  assert.match(d.widevineEME, /unverified/);
  assert.equal(d.atmos, false);
  assert.ok(!JSON.stringify(d).includes('fixture-user-token'));
  f.context.navigator.requestMediaKeySystemAccess = async () => { throw new Error('no CDM'); };
  assert.equal((await f.backend.diagnostics()).widevineEME, 'rejected');
});

test('UI and Android host cannot access raw MusicKit or credential properties', () => {
  for (const file of ['tv_core.js', 'tv_screens.js', 'tv_player.js', 'page.js']) {
    const text = readFileSync(new URL('../res/raw/' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /MusicKit\.getInstance|developerToken|musicUserToken|\.api\.music|_whenConfigured/);
  }
});
