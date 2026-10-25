# Private Shield variant

## 1.0.5-shield.4 — 2026-10-25

- Add on-demand Black screen actions in Now Playing and Settings; no inactivity timer.
- Cover the UI with solid black while leaving playback untouched. The waking remote gesture is consumed, including key repeats and release.
- Reveal the UI on a new focus target, touch, login/loading, or return to the app. Black mode is not persisted.
- Stop the player's auto-hide focus reset while black mode is requested, preventing an unintended wake-up.

## 1.0.5-shield.3 — 2026-10-25

- Handle missing Radio editorial data instead of indexing an absent array.
- Fall back to catalog station search in the account's storefront when editorial shelves are unavailable.
- Discard obsolete Radio responses on retry; show a clear retryable error if no stations are returned.
- User confirmed artwork and the TV interface working in .2.

## 1.0.5-shield.2 — 2026-10-25

- Allow static WebP artwork from Apple's image CDN. The inherited filter returned empty responses for these images, breaking covers in Apple's website UI.
- User reports that login through Apple's website UI now loads library text and starts audio. Full-song DRM playback and artwork after this fix still need device confirmation.

## 1.0.5-shield.1 — 2026-10-25

Based on upstream 1.0.5, commit `8df530e3e7591974cf41b1ef88d02ede4c294535`.

- Separate `com.megarohas.amtv.shield` installation; no Play Store publishing.
- Add an explicit playback/session/API backend contract, keeping SDK credentials out of UI modules.
- Reject full-playback actions when signed out or explicitly preview-only; pause and restore sign-in when a session expires.
- Close stale menus, remove account screens and caches on session loss; clear local WebView data on sign-out.
- Validate the real Shield login handoffs through activate.apple.com and numbered iTunes account servers.
- Restrict navigation to approved Apple HTTPS origins, disable file/content access and mixed content, scope DRM permission to the music origin.
- Disable WebView debugging for the normal APK; disable external playback/library mutation intent extras.
- Restore the native UI bridge after a renderer crash; prioritize sign-in popup keys.
- Add non-identifying AAC/EME/native WebView/Widevine diagnostics and host-side tests.
- Include MIT notice and Material Icons' Apache 2.0 license in the APK.

Real Apple login, Shield playback/DRM, AAC codec and remote behavior require device validation.
This build does not implement native MusicKit, lossless playback or Dolby Atmos.
