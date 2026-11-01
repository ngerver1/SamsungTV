// Drive the launcher like a TV remote in Chromium. Never contacts a TV.
// Usage: npm run check:browser   (first time: npx playwright install chromium)
// Optional: CHROMIUM_PATH=/path/to/chromium to use an existing browser.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 4796;
const URL = `http://127.0.0.1:${PORT}/`;
const SHOTS = 'test-results';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function ok(condition, message) {
  if (condition) console.log('  ✓ ' + message);
  else { failures++; console.log('  ✗ ' + message); }
}

const server = spawn('python3', ['scripts/preview.py', '--port', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(URL)).ok) break; } catch { /* starting */ }
  await sleep(100);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function openPage(viewport, initScript) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  // Resource failures are checked by URL below; these two are deliberate tests of the fallbacks.
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) page.errors.push(m.text()); });
  page.on('response', (r) => {
    const path = new globalThis.URL(r.url()).pathname;
    if (r.status() >= 400 && !['/assets/wallpaper.jpg', '/missing/youtube.png', '/favicon.ico'].includes(path)) page.errors.push(r.status() + ' ' + path);
  });
  if (initScript) await page.addInitScript(initScript);
  await page.goto(URL);
  await page.waitForFunction(() => window.SerifQA && window.SerifQA.state().loaded);
  return { context, page };
}
const state = (page) => page.evaluate(() => window.SerifQA.state());
async function press(page, ...keys) { for (const k of keys) { await page.keyboard.press(k); await sleep(30); } }

try {
  console.log('Browser preview, 1920 x 1080');
  {
    const { context, page } = await openPage({ width: 1920, height: 1080 });
    let s = await state(page);
    ok(s.prefs.home.length === 8 && s.prefs.home[0].appId === 'org.tizen.netflix-app', 'first run puts 8 Australian defaults on Home, Netflix first');
    await sleep(400);
    await page.screenshot({ path: `${SHOTS}/home-1080.png` });

    await press(page, 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft');
    ok((await state(page)).dock === 2, 'Left/Right moves along the dock');
    for (let i = 0; i < 12; i++) await press(page, 'ArrowRight');
    s = await state(page);
    ok(s.dock === 7, 'dock stops at the last app without wrapping');
    ok(await page.$eval('#track', (t) => t.style.transform !== 'translateX(0px)'), 'dock scrolls to keep focus visible');

    await press(page, 'ArrowUp');
    s = await state(page);
    ok(s.zone === 'utils' && s.util === 'apps', 'Up reaches the controls, starting at All apps');
    await press(page, 'ArrowRight', 'Enter');
    ok((await state(page)).panel === 'settings', 'OK on Settings opens the settings sheet');
    await press(page, 'ArrowDown', 'ArrowRight');
    s = await state(page);
    ok(s.prefs.clock === '24' && /^\d{2}:\d{2}$/.test(await page.$eval('#time', (t) => t.textContent)), 'Clock switches to 24-hour and saves');
    await press(page, 'ArrowUp', 'ArrowRight');
    s = await state(page);
    ok(s.prefs.theme === 'eucalypt' && s.theme.includes('theme-eucalypt'), 'Background changes immediately and saves');
    await sleep(300);
    await page.screenshot({ path: `${SHOTS}/settings.png` });
    await press(page, 'Escape');
    s = await state(page);
    ok(s.panel === null && s.zone === 'utils', 'Back closes Settings and returns to the controls');

    await press(page, 'ArrowLeft', 'Enter');
    await page.waitForFunction(() => window.SerifQA.state().panel === 'apps');
    await press(page, 'ArrowDown', 'ArrowRight');
    ok((await state(page)).focus === 7, 'All apps grid moves by rows and columns');
    await sleep(300);
    await page.screenshot({ path: `${SHOTS}/all-apps.png` });
    await press(page, 'ArrowUp', 'ArrowUp');
    ok((await state(page)).focus === -1, 'Up from the first row reaches Edit Home');
    await press(page, 'Enter');
    ok((await state(page)).panel === 'edit', 'OK on Edit Home opens the editor');

    await press(page, 'Enter');
    s = await state(page);
    ok(s.prefs.home.length === 7 && s.prefs.home[0].appId === '9Ur5IzDKqV.TizenYouTube', 'OK removes an app from Home');
    await press(page, 'Enter');
    s = await state(page);
    ok(s.prefs.home.length === 8 && s.prefs.home[7].appId === 'org.tizen.netflix-app' && s.focus === 7, 'OK adds it back at the end, focus follows');
    await press(page, 'ArrowRight');
    ok((await state(page)).moving, 'Right picks up a Home app');
    for (let i = 0; i < 7; i++) await press(page, 'ArrowUp');
    await sleep(250);
    await page.screenshot({ path: `${SHOTS}/edit-home-moving.png` });
    await press(page, 'Enter');
    s = await state(page);
    ok(!s.moving && s.prefs.home[0].appId === 'org.tizen.netflix-app', 'Up/Down moves it and OK puts it down');
    for (let i = 0; i < 9; i++) await press(page, 'ArrowDown');
    await sleep(250);
    ok(await page.$eval('.edit-list', (l) => l.style.transform !== 'translateY(0px)'), 'editor list scrolls with focus');
    await press(page, 'Escape', 'Escape');
    s = await state(page);
    ok(s.panel === null, 'Back closes the editor, then All apps');

    await press(page, 'ArrowDown');
    await page.keyboard.down('Escape');
    await sleep(50);
    await page.keyboard.down('Escape');
    await sleep(50);
    await page.keyboard.up('Escape');
    ok((await state(page)).panel === 'leave', 'Back on Home opens the leave dialog; a held Back acts once');
    await sleep(250);
    await page.screenshot({ path: `${SHOTS}/leave.png` });
    await press(page, 'Escape');
    ok((await state(page)).panel === null, 'Back closes the dialog');

    await press(page, 'Enter');
    await sleep(100);
    ok((await page.$eval('#toast', (t) => t.textContent)).includes('Preview only'), 'OK on an app reports that launching needs the TV');

    await page.reload();
    await page.waitForFunction(() => window.SerifQA && window.SerifQA.state().loaded);
    s = await state(page);
    ok(s.prefs.clock === '24' && s.prefs.theme === 'eucalypt' && s.prefs.home[0].appId === 'org.tizen.netflix-app', 'Preferences survive a restart');

    // Screenshot every background for review.
    await press(page, 'ArrowUp', 'ArrowRight', 'Enter');
    for (let i = 0; i < 8; i++) await press(page, 'ArrowLeft');
    for (let i = 0; i < 7; i++) {
      await press(page, 'Escape');
      await sleep(250);
      await page.screenshot({ path: `${SHOTS}/theme-${(await state(page)).prefs.theme}.png` });
      await press(page, 'ArrowUp', 'Enter', 'ArrowRight');
    }
    await sleep(300);
    s = await state(page);
    ok(s.prefs.theme === 'photo' && s.theme.includes('theme-graphite'), 'My photo without a photo falls back to Graphite');
    ok((await page.$eval('#layer', (l) => l.textContent)).includes('No photo found'), 'Settings explains how to add a photo');
    ok(page.errors.length === 0, 'no script errors' + (page.errors.length ? ': ' + page.errors.join('; ') : ''));
    await context.close();
  }

  console.log('Browser preview, 1280 x 720');
  {
    const { context, page } = await openPage({ width: 1280, height: 720 });
    const box = await page.$eval('#stage', (s) => { const r = s.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    ok(Math.abs(box[2] - 1280) < 1 && Math.abs(box[3] - 720) < 1, 'stage scales uniformly to fill 720p');
    await sleep(400);
    await page.screenshot({ path: `${SHOTS}/home-720.png` });
    await context.close();
  }

  console.log('Simulated TV (fake tizen.application)');
  {
    const fakeTV = () => {
      window.__launched = [];
      window.__exited = false;
      const red = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="400" height="260" fill="#b20710"/><text x="200" y="150" font-size="60" text-anchor="middle" fill="#fff" font-family="sans-serif">N</text></svg>');
      const apps = [
        { id: 'org.tizen.netflix-app', name: 'Netflix', show: true, iconPath: red },
        { id: '9Ur5IzDKqV.TizenYouTube', name: 'YouTube', show: true, iconPath: '/missing/youtube.png' },
        { id: 'mWK87Xghap.ABCiview', name: 'ABC iview', show: true, iconPath: '' },
        { id: 'XyZ1234567.Plex', name: 'Plex', show: true, iconPath: '' },
        { id: 'adplatform.ADPlayer', name: 'AD Player', show: true },
        { id: 'abcdefghij.UpdateService', name: 'Update Service', show: true },
        { id: 'org.tizen.something', name: 'System Thing', show: true },
        { id: 'com.samsung.tv.ambient-app', name: 'Ambient Mode', show: false },
        { id: 'yw2bHzEqX6.SerifHome', name: 'Serif Home', show: true }
      ];
      window.tizen = { application: {
        getCurrentApplication: () => ({ appInfo: { id: 'yw2bHzEqX6.SerifHome' }, exit: () => { window.__exited = true; } }),
        getAppsInfo: (done) => setTimeout(() => done(apps), 30),
        launch: (id, done, fail) => setTimeout(() => {
          window.__launched.push(id);
          if (id === 'com.samsung.tv.csfs') fail({ name: 'NotFoundError', message: 'App not found' }); else done();
        }, 20)
      } };
    };
    const { context, page } = await openPage({ width: 1920, height: 1080 }, fakeTV);
    let s = await state(page);
    ok(s.apps === 4, 'installed-app filter keeps 4 consumer apps (drops ad player, services, system items and itself)');
    ok(s.prefs.home.map((a) => a.name).join(',') === 'Netflix,YouTube,ABC iview,Plex', 'first-run Home uses the installed apps in the preferred order');
    await sleep(300);
    ok(await page.$eval('#track .dock-item:nth-child(1) .tile', (t) => t.classList.contains('has-icon')), "the TV's own app icon is shown when it loads");
    ok(await page.$eval('#track .dock-item:nth-child(2) .tile', (t) => !t.classList.contains('has-icon') && t.style.backgroundColor !== ''), 'a missing icon falls back to a coloured name tile');
    await page.screenshot({ path: `${SHOTS}/fake-tv-home.png` });

    await press(page, 'Enter');
    await sleep(100);
    s = await state(page);
    ok((await page.evaluate(() => window.__launched))[0] === 'org.tizen.netflix-app' && s.prefs.lastApp === 'org.tizen.netflix-app', 'OK launches the focused app and remembers it');
    await press(page, 'ArrowUp', 'ArrowLeft');
    ok((await state(page)).util === 'ambient', 'Ambient Mode control appears when the TV has an Ambient app');
    await press(page, 'Enter');
    await sleep(100);
    ok((await page.evaluate(() => window.__launched)).includes('com.samsung.tv.ambient-app'), 'OK on Ambient launches the discovered app');

    await press(page, 'ArrowDown', 'Escape', 'ArrowRight', 'Enter');
    await sleep(100);
    ok((await page.$eval('#toast', (t) => t.textContent)).includes('App not found'), 'a failed Samsung Home launch shows the error and stays usable');
    await press(page, 'Escape', 'ArrowRight', 'ArrowRight', 'Enter');
    await sleep(100);
    ok(await page.evaluate(() => window.__exited), 'Close Serif Home exits the app');
    ok(page.errors.length === 0, 'no script errors' + (page.errors.length ? ': ' + page.errors.join('; ') : ''));
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll browser checks passed. Screenshots are in test-results/.');
process.exit(failures ? 1 : 0);
