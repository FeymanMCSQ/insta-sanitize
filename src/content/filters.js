// // src/content/filters.js
// import { SETTINGS } from './settings.js';
// import {
//   markHidden,
//   containsPhrase,
//   getAuthorUsername,
//   debounce,
// } from './utils.js';

// function filterSidebar(root = document) {
//   if (!SETTINGS.hideSuggested && !SETTINGS.hideSponsored) return;
//   root.querySelectorAll("aside, [role='complementary']").forEach((side) => {
//     if (side.dataset.instaSanitized === '1') return;
//     if (SETTINGS.hideSponsored && containsPhrase(side, SETTINGS.phrases))
//       markHidden(side, 'sidebar-phrases');
//     else if (SETTINGS.hideSuggested && containsPhrase(side, SETTINGS.phrases))
//       markHidden(side, 'sidebar-suggested');
//   });
// }

// function filterNav(root = document) {
//   root
//     .querySelectorAll('a[href="/reels/"], a[href="/explore/"]')
//     .forEach((a) => markHidden(a, 'nav-link'));
// }

// function filterSuggestionModules(root = document) {
//   const hs = root.querySelectorAll("h2, h3, [role='heading']");
//   hs.forEach((h) => {
//     const t = (h.innerText || '').trim().toLowerCase();
//     if (t === 'suggestions for you' || t === 'suggested for you') {
//       const block = h.closest("section, div[role='region'], div");
//       if (block) markHidden(block, 'suggestions-module');
//     }
//   });
// }

// function hasFollowCTAInHeader(post) {
//   const header = post.querySelector('header') || post.firstElementChild;
//   if (!header) return false;

//   const headerText = (header.innerText || '').toLowerCase();
//   if (SETTINGS.followingWords.some((w) => headerText.includes(w.toLowerCase())))
//     return false;

//   const cands = header.querySelectorAll(
//     "button, [role='button'], a, span, div"
//   );
//   for (const el of cands) {
//     const t = (el.textContent || '').trim().toLowerCase();
//     if (t && SETTINGS.followCtaWords.some((w) => t === w || t.includes(w)))
//       return true;
//   }
//   if (
//     SETTINGS.followCtaWords.some((w) =>
//       headerText.includes(` ${w.toLowerCase()}`)
//     )
//   )
//     return true;
//   return false;
// }

// function shouldHidePost(post) {
//   if (SETTINGS.hideSponsored && containsPhrase(post, SETTINGS.phrases))
//     return 'post-phrase';
//   if (
//     (SETTINGS.onlyFollowed || SETTINGS.hideSuggested) &&
//     hasFollowCTAInHeader(post)
//   )
//     return 'post-follow-cta';

//   if (SETTINGS.onlyFollowed) {
//     const user = getAuthorUsername(post);
//     if (
//       user &&
//       SETTINGS.allowlist.some((u) => u.toLowerCase() === user.toLowerCase())
//     )
//       return false;
//   }
//   return false;
// }

// function filterPosts(root = document) {
//   root.querySelectorAll('article').forEach((post) => {
//     if (post.dataset.instaSanitized === '1') return;
//     const reason = shouldHidePost(post);
//     if (reason) markHidden(post, reason);
//   });
// }

// export const filterAll = debounce(() => {
//   try {
//     filterNav();
//     filterSidebar();
//     filterSuggestionModules();
//     filterPosts();
//   } catch (e) {
//     console.warn('[InstaSanitizer] filter error:', e);
//   }
// }, 80);

// export { filterSidebar, filterNav, filterSuggestionModules, filterPosts };

// src/content/filters.js
import { SETTINGS } from './settings.js';
import {
  markHidden,
  containsPhrase,
  getAuthorUsername,
  debounce,
} from './utils.js';

// ---- helpers --------------------------------------------------------------
function isInModal(el) {
  return !!el.closest(
    `[role="dialog"], [aria-modal="true"],
     [data-visualcompletion="modal-root"],
     [data-testid="modalContainer"],
     [data-testid="media-viewer"]`
  );
}

function onDirectPostUrl() {
  // true when viewing a direct post (e.g. /p/... or /reel/...)
  return /^\/(p|reel|tv)\//.test(location.pathname);
}

// ---- filters --------------------------------------------------------------
function filterSidebar(root = document) {
  if (!SETTINGS.hideSuggested && !SETTINGS.hideSponsored) return;

  root.querySelectorAll("aside, [role='complementary']").forEach((side) => {
    if (side.dataset.instaSanitized === '1') return;
    if (SETTINGS.hideSponsored && containsPhrase(side, SETTINGS.phrases))
      markHidden(side, 'sidebar-phrases');
    else if (SETTINGS.hideSuggested && containsPhrase(side, SETTINGS.phrases))
      markHidden(side, 'sidebar-suggested');
  });
}

function filterNav(root = document) {
  root
    .querySelectorAll('a[href="/reels/"], a[href="/explore/"]')
    .forEach((a) => markHidden(a, 'nav-link'));
}

function filterSuggestionModules(root = document) {
  const hs = root.querySelectorAll('h2, h3, [role="heading"]');
  hs.forEach((h) => {
    if (isInModal(h)) return; // <-- skip modal headers entirely
    const t = (h.innerText || '').trim().toLowerCase();
    if (t === 'suggestions for you' || t === 'suggested for you') {
      const block = h.closest("section, div[role='region'], div");
      if (block) markHidden(block, 'suggestions-module');
    }
  });
}

function hasFollowCTAInHeader(post) {
  const header = post.querySelector('header') || post.firstElementChild;
  if (!header) return false;

  const headerText = (header.innerText || '').toLowerCase();
  if (SETTINGS.followingWords.some((w) => headerText.includes(w.toLowerCase())))
    return false;

  const cands = header.querySelectorAll(
    'button, [role="button"], a, span, div'
  );
  for (const el of cands) {
    const t = (el.textContent || '').trim().toLowerCase();
    if (t && SETTINGS.followCtaWords.some((w) => t === w || t.includes(w)))
      return true;
  }
  if (
    SETTINGS.followCtaWords.some((w) =>
      headerText.includes(` ${w.toLowerCase()}`)
    )
  )
    return true;
  return false;
}

function shouldHidePost(post) {
  // never hide modal or direct post pages
  if (isInModal(post) || onDirectPostUrl()) return false;

  if (SETTINGS.hideSponsored && containsPhrase(post, SETTINGS.phrases))
    return 'post-phrase';
  if (
    (SETTINGS.onlyFollowed || SETTINGS.hideSuggested) &&
    hasFollowCTAInHeader(post)
  )
    return 'post-follow-cta';

  if (SETTINGS.onlyFollowed) {
    const user = getAuthorUsername(post);
    if (
      user &&
      SETTINGS.allowlist.some((u) => u.toLowerCase() === user.toLowerCase())
    )
      return false;
  }

  return false;
}

function filterPosts(root = document) {
  root.querySelectorAll('article').forEach((post) => {
    if (post.dataset.instaSanitized === '1') return;
    const reason = shouldHidePost(post);
    if (reason) markHidden(post, reason);
  });
}

export const filterAll = debounce(() => {
  try {
    filterNav();
    filterSidebar();
    filterSuggestionModules();
    filterPosts();
  } catch (e) {
    console.warn('[InstaSanitizer] filter error:', e);
  }
}, 80);

export { filterSidebar, filterNav, filterSuggestionModules, filterPosts };
