/* Serif Home: a quiet launcher for the Samsung Serif.
   ES5 only (the TV's web engine). Remote: arrows, OK, Back. No network, no tracking. */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var STAGE_W = 1920, STAGE_H = 1080;
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 10009: 'back', 27: 'back', 8: 'back', 461: 'back' };
  var MAX_HOME = 10, DEFAULT_COUNT = 8, PREF_KEY = 'serifhome.v1', PHOTO = 'assets/wallpaper.jpg';
  var DOCK = { pitch: 288, visible: 6 };
  var GRID = { cols: 6, colW: 272, rowH: 236, visible: 3 };
  var EDIT = { row: 84, header: 64, view: 760 };
  var THEMES = [
    { id: 'graphite', name: 'Graphite' }, { id: 'eucalypt', name: 'Eucalypt' },
    { id: 'bay', name: 'Moreton Bay' }, { id: 'dusk', name: 'River dusk' },
    { id: 'paper', name: 'Paper', light: true }, { id: 'black', name: 'Black' },
    { id: 'photo', name: 'My photo' }
  ];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var PALETTE = ['#3d5a80', '#6d597a', '#2a7d72', '#9a5b2e', '#5c677d', '#7d4e8a', '#2f6f5e', '#94433a'];
  var SVG = {
    ambient: '<rect x="3.5" y="4.5" width="17" height="13" rx="2"/><path d="M8 20.5h8"/><path d="m6.5 14.5 3.5-3.5 2.5 2.5 2-2 3 3"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
    check: '<path d="m5.5 12.5 4 4 9-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    updown: '<path d="m7.5 9.5 4.5-4.5 4.5 4.5M7.5 14.5l4.5 4.5 4.5-4.5"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>',
    right: '<path d="m9.5 5 7 7-7 7"/>'
  };
  var UTIL_NAMES = { ambient: 'Ambient', apps: 'All apps', settings: 'Settings' };

  var Device = window.SerifDevice, Catalog = window.SerifCatalog;
  var els = {};
  var prefs = loadPrefs();
  var catalog = { list: [], ambient: null, loaded: false, loading: false, error: null, preview: false, at: 0 };
  var S = { zone: 'dock', dock: 0, dockFirst: 0, util: 'apps', stack: [], held: {}, photo: null, badIcons: {} };
  var clockTimer = null, toastTimer = null;

  /* ---------- Helpers ---------- */
  function byId(id) { return document.getElementById(id); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function icon(name, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + SVG[name] + '</svg>'; }
  function themeById(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }
  function indexOfId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].appId === id) return i; return -1; }
  function hashColor(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973; return PALETTE[h % PALETTE.length]; }

  /* ---------- Preferences ---------- */
  function cleanHome(list) {
    var out = [], seen = {};
    for (var i = 0; i < list.length && out.length < MAX_HOME; i++) {
      var a = list[i];
      if (!a || typeof a.appId !== 'string' || !a.appId || seen[a.appId]) continue;
      seen[a.appId] = true;
      out.push({ appId: a.appId, name: typeof a.name === 'string' ? a.name : a.appId });
    }
    return out;
  }
  function loadPrefs() {
    var p = { home: null, theme: 'graphite', clock: '12', date: 'show', lastApp: null }, raw = null;
    try { raw = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.home)) p.home = cleanHome(raw.home);
      if (themeById(raw.theme)) p.theme = raw.theme;
      if (raw.clock === '24') p.clock = '24';
      if (raw.date === 'hide') p.date = 'hide';
      if (typeof raw.lastApp === 'string') p.lastApp = raw.lastApp;
    }
    return p;
  }
  function save() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); return true; }
    catch (e) { toast('Your change could not be saved on the TV.'); return false; }
  }

  /* ---------- App information ---------- */
  function entry(appId) {
    var i = indexOfId(catalog.list, appId), c = i >= 0 ? catalog.list[i] : null;
    var h = prefs.home ? indexOfId(prefs.home, appId) : -1, k = Catalog.known[appId] || {};
    var iconPath = c && c.icon && !S.badIcons[c.icon] ? c.icon : '';
    return {
      appId: appId,
      name: (c && c.name) || (h >= 0 && prefs.home[h].name) || k.name || appId,
      icon: iconPath, color: k.color || hashColor(appId), ink: k.ink || '#ffffff',
      missing: catalog.loaded && !catalog.preview && !c
    };
  }
  function tileHtml(appId, extra) {
    var e = entry(appId);
    var style = e.icon ? '' : ' style="background-color:' + e.color + ';color:' + e.ink + '"';
    return '<div class="tile' + (e.icon ? ' has-icon' : '') + (extra ? ' ' + extra : '') + '" data-color="' + e.color + '" data-ink="' + e.ink + '"' + style + '>'
      + (e.icon ? '<img class="tile-icon" src="' + esc(e.icon) + '" alt="">' : '')
      + '<span class="tile-word">' + esc(e.name) + '</span></div>';
  }
  // A missing installed icon falls back to the coloured name tile, once per path.
  function iconFailed(img) {
    S.badIcons[img.getAttribute('src')] = true;
    var tile = img.parentNode;
    if (!tile) return;
    tile.classList.remove('has-icon');
    tile.style.backgroundColor = tile.getAttribute('data-color');
    tile.style.color = tile.getAttribute('data-ink');
    tile.removeChild(img);
  }

  /* ---------- Catalogue ---------- */
  function pickDefaults(list) {
    var out = [], i, j;
    for (i = 0; i < Catalog.defaultHome.length && out.length < DEFAULT_COUNT; i++) {
      j = indexOfId(list, Catalog.defaultHome[i]);
      if (j >= 0) out.push({ appId: list[j].appId, name: list[j].name });
    }
    for (i = 0; i < list.length && out.length < Math.min(4, DEFAULT_COUNT); i++) {
      if (indexOfId(out, list[i].appId) < 0) out.push({ appId: list[i].appId, name: list[i].name });
    }
    return out;
  }
  function loadCatalog(force) {
    if (catalog.loading) return;
    if (!force && catalog.loaded && new Date().getTime() - catalog.at < 30000) return;
    catalog.loading = true;
    catalog.error = null;
    renderPanel();
    Device.apps(function (err, result) {
      catalog.loading = false;
      catalog.at = new Date().getTime();
      if (err) {
        catalog.error = err;
      } else {
        catalog.list = result.apps;
        catalog.ambient = result.ambient;
        catalog.preview = !!result.preview;
        catalog.loaded = true;
        if (prefs.home === null) {
          prefs.home = pickDefaults(result.apps);
          save();
        } else {
          // Keep saved names current when the TV renames an app.
          for (var i = 0; i < prefs.home.length; i++) {
            var j = indexOfId(result.apps, prefs.home[i].appId);
            if (j >= 0) prefs.home[i].name = result.apps[j].name;
          }
        }
      }
      renderHome();
      renderPanel();
    });
  }

  /* ---------- Clock and theme ---------- */
  function tick() {
    var d = new Date(), h = d.getHours(), text, suffix = '';
    if (prefs.clock === '24') text = pad(h) + ':' + pad(d.getMinutes());
    else { suffix = h < 12 ? 'am' : 'pm'; text = ((h % 12) || 12) + ':' + pad(d.getMinutes()); }
    els.time.innerHTML = esc(text) + (suffix ? '<span class="ampm">' + suffix + '</span>' : '');
    els.date.textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    els.date.style.display = prefs.date === 'hide' ? 'none' : '';
    clearTimeout(clockTimer);
    clockTimer = setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
  }
  function applyTheme() {
    var t = themeById(prefs.theme) || THEMES[0], cls = t.id;
    if (t.id === 'photo') {
      if (S.photo === null) probePhoto();
      if (S.photo !== true) cls = 'graphite';
    }
    els.stage.className = 'stage theme-' + cls + (t.light ? ' is-light' : '');
  }
  function probePhoto() {
    S.photo = 'loading';
    var img = new Image();
    img.onload = function () { S.photo = true; els.photo.src = PHOTO; applyTheme(); renderPanel(); };
    img.onerror = function () { S.photo = false; applyTheme(); renderPanel(); };
    img.src = PHOTO;
  }

  /* ---------- Home ---------- */
  function utils() { return catalog.ambient ? ['ambient', 'apps', 'settings'] : ['apps', 'settings']; }
  function dockItems() {
    if (prefs.home === null) return [{ kind: 'wait' }];
    if (!prefs.home.length) return [{ kind: 'choose' }];
    var out = [];
    for (var i = 0; i < prefs.home.length; i++) out.push({ kind: 'app', appId: prefs.home[i].appId });
    return out;
  }
  function renderHome() {
    var items = dockItems(), html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], body, name;
      if (it.kind === 'app') {
        var e = entry(it.appId);
        body = tileHtml(it.appId, e.missing ? 'is-missing' : '');
        name = e.name + (e.missing ? ' (not installed)' : '');
      } else if (it.kind === 'choose') {
        body = '<div class="tile tile-ghost">' + icon('plus') + '</div>';
        name = 'Choose apps';
      } else {
        body = '<div class="tile tile-ghost"><span class="tile-word">' + (catalog.error ? 'No apps yet' : 'Finding apps…') + '</span></div>';
        name = catalog.error ? 'Open All apps to try again' : '';
      }
      html += '<div class="dock-item" style="left:' + (i * DOCK.pitch) + 'px">' + body + '<div class="dock-name">' + esc(name) + '</div></div>';
    }
    els.track.innerHTML = html;
    var u = utils(), uh = '';
    for (var j = 0; j < u.length; j++) uh += '<div class="util" data-util="' + u[j] + '">' + icon(u[j]) + '<span>' + UTIL_NAMES[u[j]] + '</span></div>';
    els.utils.innerHTML = uh;
    S.dock = clamp(S.dock, 0, items.length - 1);
    if (utils().indexOf(S.util) < 0) S.util = 'apps';
    updateFocus();
  }
  function updateFocus() {
    var covered = S.stack.length > 0, items = els.track.children, n = items.length, i;
    for (i = 0; i < n; i++) items[i].classList.toggle('is-focus', !covered && S.zone === 'dock' && i === S.dock);
    var first = S.dockFirst;
    if (S.dock > first + DOCK.visible - 2) first = S.dock - (DOCK.visible - 2);
    if (S.dock < first + 1) first = S.dock - 1;
    first = clamp(first, 0, Math.max(0, n - DOCK.visible));
    S.dockFirst = first;
    els.track.style.transform = 'translateX(' + (-first * DOCK.pitch) + 'px)';
    var u = els.utils.children;
    for (i = 0; i < u.length; i++) u[i].classList.toggle('is-focus', !covered && S.zone === 'utils' && u[i].getAttribute('data-util') === S.util);
  }
  function homeKey(k) {
    var items = dockItems(), u = utils(), ui = u.indexOf(S.util);
    if (S.zone === 'dock') {
      if (k === 'left') S.dock = Math.max(0, S.dock - 1);
      else if (k === 'right') S.dock = Math.min(items.length - 1, S.dock + 1);
      else if (k === 'up') S.zone = 'utils';
      else if (k === 'ok') activateDock(items[S.dock]);
      else if (k === 'back') open(leavePanel());
    } else {
      if (k === 'left') S.util = u[Math.max(0, ui - 1)];
      else if (k === 'right') S.util = u[Math.min(u.length - 1, ui + 1)];
      else if (k === 'down' || k === 'back') S.zone = 'dock';
      else if (k === 'ok') activateUtil(S.util);
    }
    updateFocus();
  }
  function activateDock(it) {
    if (!it) return;
    if (it.kind === 'app') launchApp(it.appId);
    else if (it.kind === 'choose') open(editPanel());
    else open(appsPanel());
  }
  function activateUtil(id) {
    if (id === 'ambient') openAmbient();
    else if (id === 'apps') open(appsPanel());
    else open(settingsPanel());
  }

  /* ---------- Actions ---------- */
  function report(err) {
    if (!err) return;
    toast(err.message + (err.detail ? ' ' + err.detail : ''), 6000);
  }
  function launchApp(appId) {
    var e = entry(appId);
    toast('Opening ' + e.name + '…', 2500);
    Device.launch(appId, function (err) {
      if (err) { report(err); return; }
      if (prefs.lastApp !== appId) { prefs.lastApp = appId; save(); }
    });
  }
  function openAmbient() {
    if (!catalog.ambient) { toast('Ambient Mode was not found on this TV.'); return; }
    Device.launch(catalog.ambient, report);
  }
  function closeLauncher() {
    if (!Device.close()) toast('Preview only. On the TV this closes Serif Home.');
  }

  /* ---------- Panels ---------- */
  function topPanel() { return S.stack.length ? S.stack[S.stack.length - 1] : null; }
  function open(p) { S.stack.push(p); renderPanel(); if (p.onOpen) p.onOpen(); }
  function close() { S.stack.pop(); renderPanel(); }
  function renderPanel() {
    var p = topPanel();
    els.home.classList.toggle('is-covered', !!p && p.layout === 'full');
    if (!p) {
      els.layer.className = 'layer';
      els.layer.innerHTML = '';
    } else {
      els.layer.className = 'layer is-open layout-' + p.layout;
      els.layer.innerHTML = p.html();
      paintFocus(p);
    }
    updateFocus();
  }
  function paintFocus(p) {
    var nodes = els.layer.querySelectorAll('[data-f]');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('is-focus', nodes[i].getAttribute('data-f') === String(p.i));
    if (p.scroll) p.scroll();
  }
  function hint(keys) {
    var h = '';
    for (var i = 0; i < keys.length; i++) h += '<span class="hint-item"><b>' + keys[i][0] + '</b>' + keys[i][1] + '</span>';
    return '<div class="hint">' + h + '</div>';
  }

  /* All apps: a grid of installed apps. Up from the first row reaches Edit Home. */
  function appsPanel() {
    var p = { type: 'apps', layout: 'full', i: 0, first: 0 };
    p.onOpen = function () { loadCatalog(true); };
    p.html = function () {
      var list = catalog.list, body, count = '';
      if (!catalog.loaded && catalog.error) {
        p.i = 0;
        body = '<div class="empty"><p>' + esc(catalog.error.message) + '</p><div class="pill" data-f="0">Try again</div></div>';
      } else if (!catalog.loaded) {
        body = '<div class="empty"><p>Finding your apps…</p></div>';
      } else if (!list.length) {
        body = '<div class="empty"><p>No apps were found on this TV.</p></div>';
      } else {
        p.i = clamp(p.i, -1, list.length - 1);
        count = list.length + ' apps' + (catalog.preview ? ' · preview catalogue' : '');
        var cells = '';
        for (var i = 0; i < list.length; i++) {
          var a = list[i], pinned = prefs.home && indexOfId(prefs.home, a.appId) >= 0;
          cells += '<div class="cell" data-f="' + i + '" style="left:' + ((i % GRID.cols) * GRID.colW) + 'px;top:' + (Math.floor(i / GRID.cols) * GRID.rowH) + 'px">'
            + tileHtml(a.appId) + '<div class="cell-name">' + (pinned ? icon('check', 'on-home') : '') + esc(a.name) + '</div></div>';
        }
        body = '<div class="grid-view"><div class="grid">' + cells + '</div></div>';
      }
      return '<h1 class="panel-title">All apps</h1><div class="panel-sub">' + esc(count) + '</div>'
        + (catalog.loaded ? '<div class="pill panel-action" data-f="-1">' + icon('apps') + 'Edit Home</div>' : '')
        + body + hint([['OK', 'Open'], ['▲', 'Edit Home'], ['Back', 'Close']]);
    };
    p.scroll = function () {
      var grid = els.layer.querySelector('.grid');
      if (!grid) return;
      var row = Math.floor(Math.max(p.i, 0) / GRID.cols);
      if (row < p.first) p.first = row;
      if (row > p.first + GRID.visible - 1) p.first = row - GRID.visible + 1;
      grid.style.transform = 'translateY(' + (-p.first * GRID.rowH) + 'px)';
    };
    p.key = function (k) {
      var list = catalog.list, n = list.length, c = GRID.cols;
      if (k === 'back') { close(); return; }
      if (!catalog.loaded) { if (k === 'ok' && catalog.error) loadCatalog(true); return; }
      if (k === 'left' && p.i > 0 && p.i % c !== 0) p.i--;
      else if (k === 'right' && p.i >= 0 && p.i % c !== c - 1 && p.i < n - 1) p.i++;
      else if (k === 'up') p.i = p.i >= c ? p.i - c : -1;
      else if (k === 'down') {
        if (p.i === -1) p.i = n ? 0 : -1;
        else if (p.i + c < n) p.i += c;
        else if (Math.floor(p.i / c) < Math.floor((n - 1) / c)) p.i = n - 1;
      } else if (k === 'ok') {
        if (p.i === -1) open(editPanel());
        else if (list[p.i]) launchApp(list[p.i].appId);
        return;
      }
      paintFocus(p);
    };
    return p;
  }

  /* Edit Home: OK adds/removes; Right picks up a Home app, Up/Down moves it, OK drops it. */
  function editPanel() {
    var p = { type: 'edit', layout: 'full', i: 0, off: 0, moving: false };
    p.onOpen = function () { loadCatalog(false); };
    function rows() {
      var out = [], home = prefs.home || [], i;
      for (i = 0; i < home.length; i++) out.push({ appId: home[i].appId, pinned: true, pos: i });
      for (i = 0; i < catalog.list.length; i++) {
        if (indexOfId(home, catalog.list[i].appId) < 0) out.push({ appId: catalog.list[i].appId, pinned: false });
      }
      return out;
    }
    function rowIndex(appId) { var r = rows(); for (var i = 0; i < r.length; i++) if (r[i].appId === appId) return i; return 0; }
    p.html = function () {
      var r = rows(), home = prefs.home || [], html = '', y = 0, i, pinnedCount = home.length;
      p.i = clamp(p.i, 0, Math.max(0, r.length - 1));
      p.tops = [];
      html += '<div class="edit-head" style="top:' + y + 'px">On Home · ' + pinnedCount + ' of ' + MAX_HOME + '</div>';
      y += EDIT.header;
      if (!pinnedCount) { html += '<div class="edit-note" style="top:' + y + 'px">Nothing on Home yet. Add apps from the list below.</div>'; y += EDIT.row; }
      for (i = 0; i < r.length; i++) {
        if (i === pinnedCount) {
          html += '<div class="edit-head" style="top:' + y + 'px">More apps</div>';
          y += EDIT.header;
        }
        var e = entry(r[i].appId), moving = p.moving && i === p.i;
        p.tops.push(y);
        html += '<div class="edit-row' + (moving ? ' is-moving' : '') + '" data-f="' + i + '" style="top:' + y + 'px">'
          + '<span class="badge">' + icon(r[i].pinned ? 'check' : 'plus') + '</span>'
          + tileHtml(r[i].appId, 'tile-mini')
          + '<span class="edit-name">' + esc(e.name) + '</span>'
          + '<span class="edit-state">' + (moving ? icon('updown') + 'Moving' : (r[i].pinned ? (r[i].pos + 1) + (e.missing ? ' · not installed' : '') : 'Add')) + '</span></div>';
        y += EDIT.row;
      }
      if (!catalog.loaded) html += '<div class="edit-note" style="top:' + (y + 8) + 'px">' + (catalog.error ? esc(catalog.error.message) : 'Finding more apps…') + '</div>';
      p.height = y + EDIT.row;
      var help = '<div class="edit-help"><h2>How to edit</h2>'
        + '<p><b>OK</b> adds or removes an app.</p>'
        + '<p><b>▶</b> on a Home app picks it up. <b>▲ ▼</b> moves it, <b>OK</b> puts it down.</p>'
        + '<p><b>Back</b> when you are done. Changes save as you go.</p></div>';
      return '<h1 class="panel-title">Apps on Home</h1><div class="panel-sub">Up to ' + MAX_HOME + ' apps, in the order you choose.</div>'
        + '<div class="edit-view"><div class="edit-list">' + html + '</div></div>' + help;
    };
    p.scroll = function () {
      var list = els.layer.querySelector('.edit-list');
      if (!list || !p.tops || !p.tops.length) return;
      var top = p.tops[p.i] || 0;
      if (top - EDIT.header < p.off) p.off = Math.max(0, top - EDIT.header);
      if (top + EDIT.row > p.off + EDIT.view) p.off = top + EDIT.row - EDIT.view;
      list.style.transform = 'translateY(' + (-p.off) + 'px)';
    };
    p.key = function (k) {
      var r = rows(), row = r[p.i], home = prefs.home || [];
      if (p.moving) {
        if ((k === 'up' && p.i > 0) || (k === 'down' && p.i < home.length - 1)) {
          var j = k === 'up' ? p.i - 1 : p.i + 1, tmp = home[p.i];
          home[p.i] = home[j];
          home[j] = tmp;
          p.i = j;
          save();
          renderHome();
        } else if (k === 'ok' || k === 'left' || k === 'back') {
          p.moving = false;
        }
        renderPanel();
        return;
      }
      if (k === 'back') { close(); return; }
      if (k === 'up') p.i = Math.max(0, p.i - 1);
      else if (k === 'down') p.i = Math.min(r.length - 1, p.i + 1);
      else if (k === 'right' && row && row.pinned && home.length > 1) { p.moving = true; renderPanel(); return; }
      else if (k === 'ok' && row) {
        if (prefs.home === null) prefs.home = [];
        if (row.pinned) {
          prefs.home.splice(row.pos, 1);
        } else if (prefs.home.length >= MAX_HOME) {
          toast('Home holds ' + MAX_HOME + ' apps. Remove one first.');
          return;
        } else {
          prefs.home.push({ appId: row.appId, name: entry(row.appId).name });
        }
        save();
        p.i = rowIndex(row.appId);
        renderHome();
        renderPanel();
        return;
      }
      paintFocus(p);
    };
    return p;
  }

  /* Settings: a side sheet, so background changes are visible as you make them. */
  function settingsPanel() {
    var p = { type: 'settings', layout: 'side', i: 0 };
    function rows() {
      var r = [
        { id: 'theme', label: 'Background', choices: THEMES.map(function (t) { return [t.id, t.name]; }) },
        { id: 'clock', label: 'Clock', choices: [['12', '12-hour'], ['24', '24-hour']] },
        { id: 'date', label: 'Date', choices: [['show', 'Show'], ['hide', 'Hide']] },
        { id: 'edit', label: 'Apps on Home', value: (prefs.home ? prefs.home.length : 0) + ' of ' + MAX_HOME }
      ];
      if (catalog.ambient) r.push({ id: 'ambient', label: 'Ambient Mode' });
      r.push({ id: 'samsung', label: 'Samsung Smart Hub' }, { id: 'tv', label: 'TV settings' }, { id: 'close', label: 'Close Serif Home' });
      return r;
    }
    function current(row) {
      for (var i = 0; i < row.choices.length; i++) if (row.choices[i][0] === prefs[row.id]) return i;
      return 0;
    }
    function choose(row, idx) {
      var next = row.choices[idx][0];
      if (next === prefs[row.id]) return;
      prefs[row.id] = next;
      save();
      if (row.id === 'theme') applyTheme();
      tick();
      renderPanel();
    }
    p.html = function () {
      var r = rows(), html = '';
      p.i = clamp(p.i, 0, r.length - 1);
      for (var i = 0; i < r.length; i++) {
        var row = r[i], value = row.value || '';
        if (row.choices) {
          var c = current(row);
          value = '<span class="arrow' + (c > 0 ? '' : ' is-off') + '">' + icon('left') + '</span>' + esc(row.choices[c][1])
            + '<span class="arrow' + (c < row.choices.length - 1 ? '' : ' is-off') + '">' + icon('right') + '</span>';
        }
        html += '<div class="set-row' + (row.choices ? ' is-choice' : '') + '" data-f="' + i + '"><span class="set-label">' + esc(row.label) + '</span><span class="set-value">' + value + '</span></div>';
      }
      var note = '';
      if (prefs.theme === 'photo' && S.photo === false) note = 'No photo found. Save a JPEG as app/assets/wallpaper.jpg, then package and install again.';
      var id = Device.selfId() || 'browser preview';
      return '<h1 class="panel-title">Settings</h1><div class="set-list">' + html + '</div>'
        + (note ? '<p class="set-note">' + esc(note) + '</p>' : '')
        + '<p class="set-about">Serif Home ' + VERSION + ' · ' + esc(id) + '</p>';
    };
    p.key = function (k) {
      var r = rows(), row = r[p.i];
      if (k === 'back') { close(); return; }
      if (k === 'up') p.i = Math.max(0, p.i - 1);
      else if (k === 'down') p.i = Math.min(r.length - 1, p.i + 1);
      else if ((k === 'left' || k === 'right') && row.choices) {
        choose(row, clamp(current(row) + (k === 'left' ? -1 : 1), 0, row.choices.length - 1));
        return;
      } else if (k === 'ok') {
        if (row.choices) { choose(row, (current(row) + 1) % row.choices.length); return; }
        if (row.id === 'edit') open(editPanel());
        else if (row.id === 'ambient') openAmbient();
        else if (row.id === 'samsung') Device.samsungHome(report);
        else if (row.id === 'tv') Device.tvSettings(report);
        else if (row.id === 'close') closeLauncher();
        return;
      }
      paintFocus(p);
    };
    return p;
  }

  /* Back from Home: stay, go to Smart Hub, or close the launcher. */
  function leavePanel() {
    var p = { type: 'leave', layout: 'dialog', i: 0 };
    var actions = [['stay', 'Stay'], ['samsung', 'Samsung Smart Hub'], ['close', 'Close Serif Home']];
    p.html = function () {
      var b = '';
      for (var i = 0; i < actions.length; i++) b += '<div class="pill" data-f="' + i + '">' + actions[i][1] + '</div>';
      return '<div class="dialog"><h2>Leave Serif Home?</h2><p>The remote’s Home button still opens Samsung’s Smart Hub whenever you need it.</p><div class="dialog-actions">' + b + '</div></div>';
    };
    p.key = function (k) {
      if (k === 'back') { close(); return; }
      if (k === 'left') p.i = Math.max(0, p.i - 1);
      else if (k === 'right') p.i = Math.min(actions.length - 1, p.i + 1);
      else if (k === 'ok') {
        var a = actions[p.i][0];
        close();
        if (a === 'samsung') Device.samsungHome(report);
        else if (a === 'close') closeLauncher();
        return;
      }
      paintFocus(p);
    };
    return p;
  }

  /* ---------- Toast ---------- */
  function toast(text, ms) {
    els.toast.textContent = text;
    els.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('is-on'); }, ms || 3500);
  }

  /* ---------- Stage scaling, keys and lifecycle ---------- */
  function fit() {
    var w = window.innerWidth || STAGE_W, h = window.innerHeight || STAGE_H, k = Math.min(w / STAGE_W, h / STAGE_H);
    els.stage.style.transform = 'scale(' + k + ')';
    els.stage.style.left = Math.round((w - STAGE_W * k) / 2) + 'px';
    els.stage.style.top = Math.round((h - STAGE_H * k) / 2) + 'px';
  }
  function onKey(ev) {
    var k = KEYS[ev.keyCode];
    if (!k) return;
    ev.preventDefault();
    // A held OK or Back acts once until the key is released.
    if (k === 'ok' || k === 'back') {
      if (S.held[ev.keyCode]) return;
      S.held[ev.keyCode] = true;
    }
    var p = topPanel();
    if (p) p.key(k); else homeKey(k);
  }

  function start() {
    els = {
      stage: byId('stage'), photo: byId('photo'), home: byId('home'), time: byId('time'), date: byId('date'),
      utils: byId('utils'), track: byId('track'), layer: byId('layer'), toast: byId('toast')
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', function (ev) { delete S.held[ev.keyCode]; });
    document.addEventListener('error', function (ev) {
      var t = ev.target;
      if (t && t.classList && t.classList.contains('tile-icon')) iconFailed(t);
    }, true);
    window.addEventListener('resize', fit);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      tick();
      loadCatalog(false);
    });
    fit();
    applyTheme();
    tick();
    if (prefs.home && prefs.lastApp) S.dock = Math.max(0, indexOfId(prefs.home, prefs.lastApp));
    renderHome();
    loadCatalog(true);
    els.stage.focus();
  }

  // Read-only hooks for the browser checks in scripts/check-browser.mjs.
  window.SerifQA = {
    state: function () {
      var p = topPanel();
      return { zone: S.zone, dock: S.dock, util: S.util, panel: p ? p.type : null, focus: p ? p.i : null,
        moving: p ? !!p.moving : false, prefs: JSON.parse(JSON.stringify(prefs)), apps: catalog.list.length,
        loaded: catalog.loaded, theme: els.stage.className };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
