// Phase 1 backend. Only this adapter accesses MusicKit, its session and authenticated requests.
// The UI consumes this explicit contract; a future native backend must implement the same contract.
// No streams, DRM keys, passwords or tokens are returned to the UI or the Java bridge.
(function () {
  'use strict';
  if (window.__amtvBackend) return;
  function sdk() {
    try { return window.MusicKit && window.MusicKit.getInstance(); } catch (_) { return null; }
  }
  function required() {
    const m = sdk();
    if (!m) throw new Error('PLAYER_NOT_READY');
    return m;
  }
  function fullPlayback() {
    const m = required();
    if (!m.isAuthorized || m.previewOnly === true) throw new Error('SIGN_IN_REQUIRED: full playback unavailable');
    return m;
  }
  const backend = window.__amtvBackend = {
    id: 'apple-web',
    capabilities: Object.freeze({ native: false, atmos: false, lossless: false, targetAudio: 'AAC' }),
    get ready() { return !!sdk(); },
    get configured() { return required()._whenConfigured || Promise.resolve(); },
    async request(path, params) {
      const url = apiURL(path);
      return (await required().api.music(url.pathname + url.search, params || {})).data;
    },
    async send(method, path, params) {
      if (!['GET', 'POST', 'DELETE'].includes(method)) throw new Error('INVALID_API_METHOD');
      const m = required(), url = apiURL(path);
      if (!m.isAuthorized) throw new Error('SIGN_IN_REQUIRED');
      for (const k in params || {}) url.searchParams.set(k, params[k]);
      const r = await fetch(url, { method, cache: 'no-store', redirect: 'error',
        headers: { Authorization: 'Bearer ' + m.developerToken, 'Music-User-Token': m.musicUserToken } });
      if (!r.ok) throw new Error('APPLE_API_' + r.status);
      return r.status === 202 || r.status === 204 ? null : r.json().catch(() => null);
    },
    async setQueue(queue) { return fullPlayback().setQueue(queue); },
    async play() { return fullPlayback().play(); },
    async playNext(item) { return fullPlayback().playNext(item); },
    async playLater(item) { return fullPlayback().playLater(item); },
    async skipToNextItem() { return fullPlayback().skipToNextItem(); },
    async skipToPreviousItem() { return fullPlayback().skipToPreviousItem(); },
    async seekToTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('INVALID_SEEK');
      return fullPlayback().seekToTime(seconds);
    },
    async pause() { const m = sdk(); if (m) return m.pause(); },
    async authorize() { return required().authorize(); },
    async unauthorize() {
      backend.pause().catch(() => {});
      let timer;
      try {
        await Promise.race([required().unauthorize(), new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('SIGN_OUT_TIMEOUT')), 5000);
        })]);
      } finally {
        clearTimeout(timer);
        // Remove cached account content even if Apple's revocation request fails.
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('amtv.api.') || key === 'amtv.search') localStorage.removeItem(key);
        }
      }
    },
    addEventListener(event, callback) { required().addEventListener(event, callback); },
    removeEventListener(event, callback) { const m = sdk(); if (m) m.removeEventListener(event, callback); },
    // Authorization can expire without a visible error. Never present previews as full playback.
    watchSession(onRequired) {
      let notified = false, active = true;
      const check = () => {
        if (!active) return;
        const m = sdk();
        if (!m) return;
        if (m.isAuthorized && m.previewOnly !== true) { notified = false; return; }
        if (notified) return;
        notified = true; // before pause: pause may synchronously emit another state event
        backend.pause().catch(() => {});
        onRequired();
      };
      const events = ['authorizationStatusDidChange', 'playbackStateDidChange', 'nowPlayingItemDidChange'];
      events.forEach(event => backend.addEventListener(event, check));
      const timer = setInterval(check, 5000);
      check();
      return () => {
        active = false;
        clearInterval(timer);
        events.forEach(event => backend.removeEventListener(event, check));
      };
    },
    async diagnostics() {
      const m = sdk();
      const result = { backend: backend.id, authorized: !!(m && m.isAuthorized),
        previewOnly: m ? m.previewOnly === true : null, storefront: m ? m.storefrontId : null,
        targetAudio: 'AAC (actual codec must be verified on device)', atmos: false,
        aacDecoder: !!document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"'),
        widevineEME: 'unavailable', fullPlaybackVerified: false };
      if (navigator.requestMediaKeySystemAccess) {
        try {
          await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{ initDataTypes: ['cenc'],
            audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }] }]);
          result.widevineEME = 'supported; license and playback unverified';
        } catch (_) { result.widevineEME = 'rejected'; }
      }
      return result;
    }
  };
  function apiURL(path) {
    // Even pagination URLs from Apple's responses cannot send credentials to a different origin.
    if (typeof path !== 'string' || !path.startsWith('/v1/') || path.includes('\\')) throw new Error('INVALID_API_PATH');
    const url = new URL(path, 'https://amp-api.music.apple.com');
    if (url.origin !== 'https://amp-api.music.apple.com' || !url.pathname.startsWith('/v1/')) throw new Error('INVALID_API_PATH');
    return url;
  }
  for (const name of ['isAuthorized', 'previewOnly', 'storefrontId', 'playbackState', 'isPlaying',
    'currentPlaybackTime', 'currentPlaybackDuration', 'nowPlayingItem', 'queue']) {
    Object.defineProperty(backend, name, { get() { const m = sdk(); return m && m[name]; } });
  }
  for (const name of ['shuffleMode', 'repeatMode']) {
    Object.defineProperty(backend, name, { get() { const m = sdk(); return m && m[name]; },
      set(value) { required()[name] = value; } });
  }
})();
