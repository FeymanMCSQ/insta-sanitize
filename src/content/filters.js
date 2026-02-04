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

  // Optimised: Scope to sidebar if possible, but fallback to document if not found (responsive layout)
  const context = root.querySelector("aside, [role='complementary']") || root;

  if (SETTINGS.hideSuggested) {
    // Find "Suggested for you" text
    // "Suggested for you" is usually in a span inside a div
    const candidates = context.querySelectorAll('span, div');

    for (const el of candidates) {
      // Skip if hidden or likely irrelevant
      if (el.offsetParent === null) continue; // not visible
      if (el.childElementCount > 1) continue; // keep it to leaf-ish nodes

      const text = (el.innerText || '').trim().toLowerCase();

      if (text === 'suggested for you' || text === 'suggestions for you') {
        // Found the label. Now find the container.
        // Structure is usually: 
        // div (Container)
        //   div (Header Row) -> contains "Suggested for you" and "See All"
        //   div (List) -> contains users

        // We want to hide 'div (Container)' OR 'Header Row' + 'List'.

        // 1. Get the header row (usually direct parent or grandparent of text)
        let current = el;
        // Walk up to find the container div

        let container = null;
        let p = el.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!p) break;

          // If we go too high, we hit the sidebar root.
          if (p.tagName === 'ASIDE' || p.role === 'complementary') break;

          // Check if p is the header row
          // It should have the text 'el' and maybe "See All"
          if (p.innerText.toLowerCase().includes('see all')) {

            // Ideally, 'p' is the header row.
            // The list of users should be the NEXT SIBLING of 'p', or 'p' parent's next sibling.

            // 1. Hide the header row
            markHidden(p, 'sidebar-suggested-header');

            // 2. Hide the list (Next Sibling)
            if (p.nextElementSibling) {
              markHidden(p.nextElementSibling, 'sidebar-suggested-list');
            }

            // Also try to find a parent that wraps both, to be cleaner?
            if (p.parentElement && p.parentElement.children.length === 2) {
              markHidden(p.parentElement, 'sidebar-suggested-container');
            }

            container = p; // Stop loop
            break;
          }

          p = p.parentElement;
        }

        if (!container) {
          // Fallback: just hide the immediate parent structure if clear container not found
          markHidden(el.parentElement, 'sidebar-suggested-fallback');
        }
      }
    }
  }
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
