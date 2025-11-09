// src/content/settings.js
export const DEFAULT_SETTINGS = {
  blockExplore: true,
  blockReels: true,
  hideSuggested: true,
  hideSponsored: true,
  onlyFollowed: true,
  debug: false,
  allowlist: [],
  phrases: [
    'Suggested for you',
    'Sponsored',
    'Because you follow',
    'More like this',
    'Suggested posts',
    'You might like',
  ],
  followCtaWords: ['follow', 'follow back'],
  followingWords: ['following'],
};

export let SETTINGS = { ...DEFAULT_SETTINGS };

export function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage?.sync?.get(DEFAULT_SETTINGS, (v) => {
      SETTINGS = { ...DEFAULT_SETTINGS, ...v };
      resolve(SETTINGS);
    });
  });
}

export function attachStorageListener() {
  let t;
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'sync') return;
    Object.keys(changes).forEach((k) => (SETTINGS[k] = changes[k].newValue));
    clearTimeout(t);
    t = setTimeout(() => {
      // lazy import to avoid cycle
      import('./filters.js').then((m) => m.filterAll());
    }, 80);
  });
}
