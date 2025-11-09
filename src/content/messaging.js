// src/content/messaging.js
import { loadSettings } from './settings.js';
import { filterAll } from './filters.js';

export function attachMessaging() {
  chrome.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'insta-sanitizer:refresh') {
      loadSettings()
        .then(() => {
          filterAll();
          sendResponse?.({ ok: true });
        })
        .catch(() => sendResponse?.({ ok: false }));
      return true;
    }
  });
}
