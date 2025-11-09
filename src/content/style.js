// src/content/style.js
import { once } from './utils.js';

export const injectCSS = once(() => {
  const style = document.createElement('style');
  style.setAttribute('data-insta-sanitizer', '1');
  style.textContent = `
    a[href="/explore/"], a[href="/reels/"] { display: none !important; }
    [data-insta-sanitized="1"] { display: none !important; }
  `;
  document.documentElement.appendChild(style);
});
