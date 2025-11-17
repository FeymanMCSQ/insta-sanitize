// // src/content/observe.js
// import {
//   filterAll,
//   filterPosts,
//   filterNav,
//   filterSidebar,
//   filterSuggestionModules,
// } from './filters.js';

// export function startObserver() {
//   const obs = new MutationObserver((muts) => {
//     for (const m of muts) {
//       if (!m.addedNodes?.length) continue;
//       m.addedNodes.forEach((n) => {
//         if (!(n instanceof Element)) return;
//         if (n.matches?.('article') || n.querySelector?.('article'))
//           filterPosts(n);
//         if (n.querySelector?.('a[href="/reels/"], a[href="/explore/"]'))
//           filterNav(n);
//         if (
//           n.matches?.("aside, [role='complementary']") ||
//           n.querySelector?.("aside, [role='complementary']")
//         )
//           filterSidebar(n);
//         if (n.querySelector?.("h2, h3, [role='heading']"))
//           filterSuggestionModules(n);
//       });
//     }
//     filterAll();
//   });

//   obs.observe(document.documentElement, { childList: true, subtree: true });
// }

// src/content/observe.js
import {
  filterAll,
  filterPosts,
  filterNav,
  filterSidebar,
  filterSuggestionModules,
} from './filters.js';

function isInModal(el) {
  return !!el.closest(
    `[role="dialog"], [aria-modal="true"],
     [data-visualcompletion="modal-root"],
     [data-testid="modalContainer"],
     [data-testid="media-viewer"]`
  );
}

export function startObserver() {
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (!m.addedNodes?.length) continue;

      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;

        // Skip modal DOM entirely — allow popups/DM media viewers to render untouched
        if (isInModal(n)) return;

        // Targeted, cheap sub-tree passes
        if (n.matches?.('article') || n.querySelector?.('article')) {
          filterPosts(n);
        }
        if (n.querySelector?.('a[href="/reels/"], a[href="/explore/"]')) {
          filterNav(n);
        }
        if (
          n.matches?.("aside, [role='complementary']") ||
          n.querySelector?.("aside, [role='complementary']")
        ) {
          filterSidebar(n);
        }
        if (n.querySelector?.("h2, h3, [role='heading']")) {
          filterSuggestionModules(n);
        }
      });
    }

    // Debounced full sweep for any stragglers
    filterAll();
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
