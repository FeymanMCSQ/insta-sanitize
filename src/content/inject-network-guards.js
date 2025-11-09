// src/content/inject-network-guards.js
export function injectNetworkGuards() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('src/content/page-guards.js');
  // ensure it runs before IG app code
  s.async = false;
  (document.head || document.documentElement).appendChild(s);
  s.remove();
}
