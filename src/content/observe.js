// src/content/observe.js
import {
  filterAll,
  filterPosts,
  filterNav,
  filterSidebar,
  filterSuggestionModules,
} from './filters.js';

export function startObserver() {
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (!m.addedNodes?.length) continue;
      m.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.matches?.('article') || n.querySelector?.('article'))
          filterPosts(n);
        if (n.querySelector?.('a[href="/reels/"], a[href="/explore/"]'))
          filterNav(n);
        if (
          n.matches?.("aside, [role='complementary']") ||
          n.querySelector?.("aside, [role='complementary']")
        )
          filterSidebar(n);
        if (n.querySelector?.("h2, h3, [role='heading']"))
          filterSuggestionModules(n);
      });
    }
    filterAll();
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
}
