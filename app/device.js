/* Device adapter: the only file that talks to the TV. Public Tizen application APIs only.
   Filtering and Samsung component IDs are adapted from CleanFrame (MIT), whose reference TV
   runs the same firmware family (T-PTMDUABC-0090-2130.0) as this project's target Serif. */
(function () {
  'use strict';

  // Samsung components recorded on the CleanFrame reference TV. Still to be visually confirmed
  // on the Serif; a failed launch shows a message and leaves the launcher usable.
  var SAMSUNG_HOME = ['com.samsung.tv.csfs'];
  var TV_SETTINGS = ['com.samsung.tv.coba.setting'];

  // Hidden services that Samsung marks as visible. Never shown in All apps.
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'd0m1lV1nt2.emanual', '2022ePop01.SmartTV', 'ZODRT12q2l.WebAccountExtension',
    'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices', 'com.samsung.tv.cobalt-yt'];
  var CONSUMER_SYSTEM = ['org.tizen.browser'];
  var NOISE = /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon|widget)/i;
  var STORE_ID = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/;

  function api() { return window.tizen && window.tizen.application; }
  function onTV() { return !!api(); }

  function selfId() {
    try { return api().getCurrentApplication().appInfo.id; } catch (err) { return ''; }
  }

  function preview(done, what) {
    done({ preview: true, message: 'Preview only.', detail: 'On the TV this ' + what + '.' });
  }

  function failure(err) {
    return { message: 'The TV could not open that.', detail: (err && (err.message || err.name)) || 'Please try again.' };
  }

  // Every device call reports back exactly once, even if the TV never answers.
  function bounded(done, ms) {
    var finished = false;
    var timer = setTimeout(function () { finish({ message: 'The TV did not respond.', detail: 'Please try again.' }); }, ms || 8000);
    function finish(err, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      done(err, value);
    }
    return finish;
  }

  function launch(appId, done) {
    if (!onTV()) { preview(done, 'opens the app'); return; }
    var finish = bounded(done);
    try { api().launch(appId, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }

  // Try each candidate in turn; report the last failure if none open.
  function launchFirst(ids, done, what) {
    if (!onTV()) { preview(done, what); return; }
    var i = 0;
    function next(lastErr) {
      if (i >= ids.length) { done(lastErr || { message: 'Not available on this TV.' }); return; }
      launch(ids[i++], function (err) { if (err) next(err); else done(null); });
    }
    next(null);
  }

  function samsungHome(done) { launchFirst(SAMSUNG_HOME, done, 'opens Samsung Smart Hub'); }
  function tvSettings(done) { launchFirst(TV_SETTINGS, done, 'opens the TV settings'); }

  function close() {
    if (!onTV()) return false;
    try { api().getCurrentApplication().exit(); return true; } catch (err) { return false; }
  }

  function findAmbient(list, preferred) {
    var i, j;
    for (i = 0; i < preferred.length; i++) {
      for (j = 0; j < list.length; j++) if (list[j].id === preferred[i]) return list[j].id;
    }
    for (j = 0; j < list.length; j++) {
      var a = list[j], text = (a.id || '') + ' ' + (a.name || '');
      if (/ambient/i.test(text) && !/(?:service|daemon|plugin|widget|setting)/i.test(text)) return a.id;
    }
    return null;
  }

  function sample(catalog) {
    var out = [];
    for (var i = 0; i < catalog.previewApps.length; i++) {
      var id = catalog.previewApps[i], k = catalog.known[id] || {};
      out.push({ appId: id, name: k.name || id, icon: '' });
    }
    return out.sort(byName);
  }

  function byName(x, y) { return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1; }

  // Installed consumer apps, alphabetical, plus the Ambient Mode app if one exists.
  function apps(done) {
    var catalog = window.SerifCatalog;
    if (!onTV()) {
      setTimeout(function () { done(null, { apps: sample(catalog), ambient: null, preview: true }); }, 150);
      return;
    }
    var finish = bounded(done, 20000);
    try {
      api().getAppsInfo(function (list) {
        var seen = {}, result = [], self = selfId();
        for (var i = 0; i < list.length; i++) {
          var a = list[i], known = !!catalog.known[a.id];
          var consumer = STORE_ID.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (!a.id || !a.name || a.id === self || seen[a.id] || INTERNAL.indexOf(a.id) >= 0) continue;
          if (!known && (!a.show || !consumer)) continue;
          if (!known && NOISE.test(a.name + ' ' + a.id)) continue;
          if (/-dummy$/.test(a.id)) continue;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, icon: a.iconPath || '' });
        }
        result.sort(byName);
        finish(null, { apps: result, ambient: findAmbient(list, catalog.ambientIds), preview: false });
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }

  window.SerifDevice = {
    onTV: onTV, selfId: selfId, apps: apps, launch: launch,
    samsungHome: samsungHome, tvSettings: tvSettings, close: close
  };
}());
