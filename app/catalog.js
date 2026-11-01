/* Known apps: display hints only. The TV's own installed-app list is the source of truth.
   App IDs were recorded on an Australian 2024 Samsung TV (firmware family T-PTMDUABC) by the
   CleanFrame project. Run `npm run tv:apps` to confirm the IDs on your own TV. */
(function () {
  'use strict';

  // appId -> name and tile colours (used when the TV's own icon is unavailable).
  var KNOWN = {
    'org.tizen.netflix-app': { name: 'Netflix', color: '#b20710' },
    '9Ur5IzDKqV.TizenYouTube': { name: 'YouTube', color: '#c4001d' },
    'mWK87Xghap.ABCiview': { name: 'ABC iview', color: '#0d5c63' },
    'OyE7OuxlUi.SBSOnDemand': { name: 'SBS On Demand', color: '#f2b51b', ink: '#14110a' },
    'MCmYXNxgcu.DisneyPlus': { name: 'Disney+', color: '#0e2f7a' },
    'org.tizen.primevideo': { name: 'Prime Video', color: '#0f6a99' },
    '73iTZRTc34.Stan': { name: 'Stan', color: '#0a53bd' },
    'as6cYRgkPy.Binge': { name: 'BINGE', color: '#4b21c2' },
    'icp4AvUPiA.7plus': { name: '7plus', color: '#c21c14' },
    'Ne2ZsPWdKl.9NOW': { name: '9Now', color: '#0f7cc0' },
    'KaLitts8bq.tenplaySamsungTizen': { name: '10', color: '#262626' },
    'eYuOiOLYQX.KayoSports': { name: 'Kayo', color: '#0aa65b', ink: '#04170c' },
    'com.samsung.tv.aria-video': { name: 'Apple TV', color: '#1d1d1f' },
    'org.tizen.apple.apple-music': { name: 'Apple Music', color: '#c81d3a' },
    'rJeHak5zRg.Spotify': { name: 'Spotify', color: '#1db954', ink: '#04140a' },
    '3KA0pm7a7V.TubiTV': { name: 'Tubi', color: '#5b12b5' },
    'Jz7aUrV2Q4.Twitch': { name: 'Twitch', color: '#6a2fd6' },
    'cj37Ni3qXM.HBONow': { name: 'HBO Max', color: '#2b1e7a' },
    'IkWsFHtOY9.Stremio': { name: 'Stremio', color: '#5a3fc0' },
    'org.tizen.browser': { name: 'Internet', color: '#34495e' }
  };

  // First-run Home order. Only apps actually installed on the TV are used.
  var DEFAULT_HOME = [
    'org.tizen.netflix-app', '9Ur5IzDKqV.TizenYouTube', 'mWK87Xghap.ABCiview', 'OyE7OuxlUi.SBSOnDemand',
    'MCmYXNxgcu.DisneyPlus', 'org.tizen.primevideo', '73iTZRTc34.Stan', 'as6cYRgkPy.Binge',
    'icp4AvUPiA.7plus', 'Ne2ZsPWdKl.9NOW', 'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports'
  ];

  // Ambient Mode app IDs, checked in order. Leave empty to rely on name matching
  // ("ambient" in the app ID or name). Add the ID from `npm run tv:apps` if needed.
  var AMBIENT_IDS = [];

  // Browser preview only: a pretend catalogue so the interface can be explored on a computer.
  var PREVIEW_APPS = [
    'org.tizen.netflix-app', '9Ur5IzDKqV.TizenYouTube', 'mWK87Xghap.ABCiview', 'OyE7OuxlUi.SBSOnDemand',
    'MCmYXNxgcu.DisneyPlus', 'org.tizen.primevideo', '73iTZRTc34.Stan', 'icp4AvUPiA.7plus',
    'Ne2ZsPWdKl.9NOW', 'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'as6cYRgkPy.Binge',
    'com.samsung.tv.aria-video', 'rJeHak5zRg.Spotify', 'org.tizen.browser'
  ];

  window.SerifCatalog = {
    known: KNOWN,
    defaultHome: DEFAULT_HOME,
    ambientIds: AMBIENT_IDS,
    previewApps: PREVIEW_APPS
  };
}());
