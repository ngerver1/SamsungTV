# Notes for coding agents

Serif Home is a Tizen web app launcher for one Samsung Serif (QA55LS01DAWXXY, firmware T-PTMDUABC-0090-2130.0, Tizen 9, 32-bit ARM). Read `README.md` and `docs/setup-guide.md` first.

## App code (`app/`)

- Runtime JavaScript must be **ES5**: no `let`/`const`, arrow functions, template strings, classes or modules. `npm run lint` enforces this.
- CSS must not use `gap` or `inset`; use margins and explicit edges. `npm run check` enforces this.
- All TV calls go through `app/device.js`. Keep every call bounded (`bounded()`), and report failures. Never fake success.
- The layout is a fixed 1920 × 1080 stage, scaled to fit. Check changes at 1920 × 1080 and 1280 × 720.
- Remote keys: arrows, OK (13) and Back (10009). Focus alone must never launch an app. A held OK or Back acts once.
- Preferences live in localStorage under `serifhome.v1`. Keep `loadPrefs()` tolerant of old or partial data.

Run `npm run check` and `npm run check:browser` after app changes. Run `npm run check:tools` after changes to `scripts/`.

## The TV

- Repository work never authorises TV access. Only connect, install, launch or uninstall when the owner asks in that session. Announce anything that changes the screen.
- Never change the Home button or startup settings (`vconf`, native Home operation). That is a separate, higher-risk task; see `docs/native-home.md`.
- Keep certificates, passwords, the DUID, IP addresses and anything in `.local/` or `dist/` out of commits, issues and logs.
- Don't factory-reset, downgrade firmware, root the TV or change its security policy.
