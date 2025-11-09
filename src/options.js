// src/options.js

// Keep these in sync with DEFAULT_SETTINGS in content.js
const DEFAULT_PHRASES = [
  'Suggested for you',
  'Sponsored',
  'Because you follow',
  'More like this',
  'Suggested posts',
  'You might like',
];

const DEFAULT_SETTINGS = {
  phrases: DEFAULT_PHRASES,
  allowlist: [],
};

const $ = (id) => document.getElementById(id);

function normalizeList(textareaValue) {
  // Split by newlines, trim, drop empties, dedupe (case-insensitive)
  const seen = new Set();
  const out = [];
  (textareaValue || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    });
  return out;
}

function listToTextarea(list) {
  return (Array.isArray(list) ? list : []).join('\n');
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      const phrases =
        Array.isArray(stored.phrases) && stored.phrases.length
          ? stored.phrases
          : DEFAULT_PHRASES.slice();
      const allowlist = Array.isArray(stored.allowlist) ? stored.allowlist : [];
      resolve({ phrases, allowlist });
    });
  });
}

function saveSettings(values) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(values, () => resolve());
  });
}

function setStatus(msg, ok = true) {
  const el = $('status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#a7f3d0' : '#fecaca';
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => (el.textContent = ''), 1500);
}

async function init() {
  // Populate UI
  const { phrases, allowlist } = await loadSettings();
  $('phrasesTextarea').value = listToTextarea(phrases);
  $('allowlistTextarea').value = listToTextarea(allowlist);

  $('saveBtn').addEventListener('click', async () => {
    const newPhrases = normalizeList($('phrasesTextarea').value);
    const newAllow = normalizeList($('allowlistTextarea').value);

    await saveSettings({ phrases: newPhrases, allowlist: newAllow });
    setStatus('Saved. Changes will apply instantly.');
    // Content script will auto-apply via chrome.storage.onChanged listener.
  });

  $('resetBtn').addEventListener('click', async () => {
    $('phrasesTextarea').value = listToTextarea(DEFAULT_PHRASES);
    await saveSettings({ phrases: DEFAULT_PHRASES });
    setStatus('Phrases reset to defaults.');
  });
}

document.addEventListener('DOMContentLoaded', init);
