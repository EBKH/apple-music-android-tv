// Injected into music.apple.com once it has loaded (MainActivity.onPageFinished). Idempotent.
(function () {
  if (window.__amtv) return;

  // Apple's hidden interface plays animated artwork (HLS video from mvod.itunes.apple.com): about
  // a hundred requests a minute through the tunnel even at rest, so the music's own requests queue
  // behind them. The music never comes from there (audio is aod-ssl): refuse those requests…
  var MOTION = /^https:\/\/mvod\.itunes\.apple\.com\/itunes-assets\//;
  var xopen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (MOTION.test(String(url))) args[1] = 'data:,';
    return xopen.apply(this, args);
  };
  var xfetch = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === 'string' ? input : input && input.url;
    if (MOTION.test(String(url))) return Promise.resolve(new Response('', { status: 404 }));
    return xfetch.apply(this, arguments);
  };
  // (MainActivity opens the site on Search, which has none of that video in the first place.)
  var raf = window.requestAnimationFrame.bind(window), held = [], awakeUntil = 0;

  window.__amtv = {
    // Let the now-playing background move for a while: the player just opened, or a new track
    // brought new colours. Frames it asked for while frozen are handed over now.
    wake: function (ms) {
      awakeUntil = Math.max(awakeUntil, performance.now() + (ms || 2500));
      var h = held;
      held = [];
      h.forEach(function (cb) { raf(cb); });
    }
  };

  // The now-playing backdrop is a full-screen WebGL scene redrawn every frame. On this box that
  // alone eats a CPU core and drags every other frame to ~30 ms, so it settles and then freezes.
  window.requestAnimationFrame = function (cb) {
    if (performance.now() > awakeUntil && /\/scene[~.-]/.test(new Error().stack || '')) {
      held.push(cb);
      return 0;
    }
    return raf(cb);
  };

  (function hook(tries) {
    var mk = window.MusicKit && MusicKit.getInstance && MusicKit.getInstance();
    if (mk) mk.addEventListener('nowPlayingItemDidChange', function () { window.__amtv.wake(3000); });
    else if (tries > 0) setTimeout(function () { hook(tries - 1); }, 1000);
  })(60);
})();
