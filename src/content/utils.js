// src/content/utils.js
import { SETTINGS } from './settings.js';

export const log = (...a) =>
  SETTINGS.debug && console.log('[InstaSanitizer]', ...a);

export const once = (fn) => {
  let d = false;
  return (...x) => (d ? undefined : ((d = true), fn(...x)));
};

export const debounce = (fn, ms = 80) => {
  let t = null;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

export const closestFromEvent = (e, sel) =>
  e.target && e.target.closest ? e.target.closest(sel) : null;

export function markHidden(el, why) {
  if (!el || el.dataset.instaSanitized) return;
  el.dataset.instaSanitized = '1';
  el.setAttribute('data-insta-sanitized-why', why || '');
  el.style.display = 'none';
  log('hide:', why, el);
}

export function containsPhrase(el, phrases) {
  const txt = (el.innerText || '').toLowerCase();
  return phrases.some((p) => p && txt.includes(p.toLowerCase()));
}

export function getAuthorUsername(el) {
  const links = el.querySelectorAll("header a, a[role='link']");
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    if (/^\/[^/]+\/$/.test(href) && !/^\/p\//.test(href))
      return href.replace(/^\/|\/$/g, '');
  }
  return null;
}
