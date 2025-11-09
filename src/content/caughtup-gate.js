// Detects "You're all caught up" or "Suggested Posts" and toggles network block in page
export function installCaughtUpGate() {
  const send = (type) => window.postMessage({ type }, '*');

  // Heuristic check on the document
  const check = (root = document) => {
    const txt = (root.innerText || '').toLowerCase();
    const caughtUp = txt.includes("you're all caught up");
    const hasSuggestedHeading = !!root
      .querySelector('h2,h3,[role="heading"]')
      ?.innerText?.toLowerCase?.()
      .includes('suggested posts');
    return caughtUp || hasSuggestedHeading;
  };

  let enabled = false;
  const maybeFlip = (root) => {
    const shouldEnable = check(root);
    if (shouldEnable && !enabled) {
      send('insta-sanitizer:enable-suggest-block');
      enabled = true;
    } else if (!shouldEnable && enabled) {
      send('insta-sanitizer:disable-suggest-block');
      enabled = false;
    }
  };

  // Initial scan + observer
  maybeFlip(document);

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n instanceof Element) {
            maybeFlip(n);
          }
        }
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Also flip off on navigation
  window.addEventListener('popstate', () => {
    send('insta-sanitizer:disable-suggest-block');
    enabled = false;
  });
}
