// src/content.loader.js
// Dynamic import keeps MV3 happy while letting us use ESM modules.
(async () => {
  try {
    await import(chrome.runtime.getURL('src/content/main.js'));
  } catch (e) {
    console.error('[InstaSanitizer] loader failed:', e);
  }
})();
