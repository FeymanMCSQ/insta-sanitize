// src/popup.js
const DEFAULT_SETTINGS = {
  blockExplore: true,
  blockReels: true,
  hideSuggested: true,
  hideSponsored: true,
  onlyFollowed: true,
  debug: false,
};

const el = (id) => document.getElementById(id);
const KEYS = Object.keys(DEFAULT_SETTINGS);

async function getActiveInstaTabs() {
  return new Promise((resolve) => {
    // Works without extra permissions if user triggered from the popup (active window)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const instaTabs = tabs.filter((t) =>
        /^https?:\/\/(www\.)?instagram\.com\//.test(t.url || '')
      );
      resolve(instaTabs);
    });
  });
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      resolve({ ...DEFAULT_SETTINGS, ...stored });
    });
  });
}

function saveSettings(values) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(values, () => resolve());
  });
}

function applyToUI(values) {
  KEYS.forEach((key) => {
    const box = el(key);
    if (box) box.checked = !!values[key];
  });
}

function readFromUI() {
  const out = {};
  KEYS.forEach((key) => {
    const box = el(key);
    if (box) out[key] = !!box.checked;
  });
  return out;
}

function setStatus(msg, ok = true) {
  const s = el('status');
  if (!s) return;
  s.textContent = msg;
  s.style.color = ok ? '#a7f3d0' : '#fecaca';
  // auto-clear after a moment
  setTimeout(() => (s.textContent = ''), 1500);
}

async function notifyActiveTab() {
  const tabs = await getActiveInstaTabs();
  if (tabs.length === 0) return;

  // Ask the content script to reload settings and re-filter
  for (const t of tabs) {
    try {
      await chrome.tabs.sendMessage(t.id, { type: 'insta-sanitizer:refresh' });
    } catch (_) {
      // If no listener yet, fail silently. User can refresh the page.
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const values = await loadSettings();
  applyToUI(values);

  el('save')?.addEventListener('click', async () => {
    const updated = readFromUI();
    await saveSettings(updated);
    setStatus('Saved. Applying…', true);
    await notifyActiveTab();
    setStatus('Done.');
  });

  el('openOptions')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      // Fallback (older Chromium)
      window.open(chrome.runtime.getURL('src/options.html'));
    }
  });
});
