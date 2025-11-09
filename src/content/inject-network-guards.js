// src/content/inject-network-guards.js
export function injectNetworkGuards() {
  // page-guards.js (your caught-up blocker – keep it)
  const s1 = document.createElement('script');
  s1.src = chrome.runtime.getURL('src/content/page-guards.js');
  s1.async = false;
  (document.head || document.documentElement).appendChild(s1);
  s1.remove();

  // page-feed-filter.js (new: rewrites feed JSON to keep followed only)
  const s2 = document.createElement('script');
  s2.src = chrome.runtime.getURL('src/content/page-feed-filter.js');
  s2.async = false;
  (document.head || document.documentElement).appendChild(s2);
  s2.remove();
}
