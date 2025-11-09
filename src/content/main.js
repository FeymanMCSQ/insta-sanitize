// src/content/main.js
import { loadSettings, SETTINGS, attachStorageListener } from './settings.js';
import { injectCSS } from './style.js';
import { installRouteGuards } from './routes.js';
import { startObserver } from './observe.js';
import { filterAll } from './filters.js';
import { attachMessaging } from './messaging.js';
import { injectNetworkGuards } from './inject-network-guards.js';
import { installCaughtUpGate } from './caughtup-gate.js'; // <-- add this
import { loadFollowCache, attachFollowLearner } from './follow-cache.js';

(async function init() {
  try {
    await loadSettings();
    await loadFollowCache(); // <— load cache before injecting page scripts
    attachFollowLearner(); // <— listen for learned usernames
    injectNetworkGuards(); // page patch (off by default)
    installCaughtUpGate(); // flips block ON after "You're all caught up"
    injectCSS();
    installRouteGuards();
    attachMessaging();
    attachStorageListener();

    filterAll();
    startObserver();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => filterAll(), {
        once: true,
      });
    }
  } catch (e) {
    console.error('[InstaSanitizer] init error:', e);
  }
})();
