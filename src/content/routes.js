// src/content/routes.js
import { SETTINGS } from './settings.js';
import { closestFromEvent } from './utils.js';
import { filterAll } from './filters.js';

let installed = false;

export function installRouteGuards() {
  if (installed) return;
  installed = true;

  document.addEventListener(
    'click',
    (e) => {
      if (!SETTINGS.blockExplore && !SETTINGS.blockReels) return;
      const a = closestFromEvent(e, 'a[href^="/explore"], a[href^="/reels"]');
      if (a) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  const p = history.pushState,
    r = history.replaceState;
  history.pushState = function (...args) {
    const out = p.apply(this, args);
    setTimeout(filterAll, 0);
    return out;
  };
  history.replaceState = function (...args) {
    const out = r.apply(this, args);
    setTimeout(filterAll, 0);
    return out;
  };
  window.addEventListener('popstate', filterAll);
}
