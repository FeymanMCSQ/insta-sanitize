// src/content/follow-cache.js
// Keep a Set in content world, persist to chrome.storage, and expose to page via window.postMessage.

const KEY = 'followSetV1'; // array of lowercase usernames
let FOLLOW = new Set();

export async function loadFollowCache() {
  return new Promise((resolve) => {
    chrome.storage?.sync?.get({ [KEY]: [] }, (res) => {
      FOLLOW = new Set((res[KEY] || []).map((s) => String(s).toLowerCase()));
      exposeToPage(); // push to page context
      resolve();
    });
  });
}

export function isFollow(username) {
  return username && FOLLOW.has(String(username).toLowerCase());
}

export function addFollow(username) {
  if (!username) return;
  const u = String(username).toLowerCase();
  if (FOLLOW.has(u)) return;
  FOLLOW.add(u);
  // persist (debounced save)
  scheduleSave();
  // notify page to update its copy
  window.postMessage(
    { type: 'insta-sanitizer:follow-cache-update', payload: [u] },
    '*'
  );
}

// ---- persistence debounce
let tSave = null;
function scheduleSave() {
  clearTimeout(tSave);
  tSave = setTimeout(() => {
    chrome.storage?.sync?.set({ [KEY]: Array.from(FOLLOW) });
  }, 300);
}

// ---- expose to page (CSP-safe via postMessage)
function exposeToPage() {
  window.postMessage(
    { type: 'insta-sanitizer:follow-cache-full', payload: Array.from(FOLLOW) },
    '*'
  );
}

// ---- learn from page (page script posts usernames it knows for sure)
export function attachFollowLearner() {
  window.addEventListener('message', (ev) => {
    const d = ev?.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'insta-sanitizer:learn-follow' && Array.isArray(d.payload)) {
      d.payload.forEach(addFollow);
    }
  });
}
