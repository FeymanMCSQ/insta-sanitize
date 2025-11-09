// src/content/page-feed-filter.js
(() => {
  // ---- Follow cache & strict mode (filled via postMessage from content world)
  let FOLLOW = new Set(); // lowercase usernames you follow
  let STRICT = true; // drop unknown/non-followed aggressively
  let hasCache = false; // becomes true after first full sync

  window.addEventListener('message', (ev) => {
    const d = ev?.data;
    if (!d || typeof d !== 'object') return;

    if (
      d.type === 'insta-sanitizer:follow-cache-full' &&
      Array.isArray(d.payload)
    ) {
      FOLLOW = new Set(d.payload.map((s) => String(s).toLowerCase()));
      hasCache = true;
    }
    if (
      d.type === 'insta-sanitizer:follow-cache-update' &&
      Array.isArray(d.payload)
    ) {
      d.payload.forEach((u) => FOLLOW.add(String(u).toLowerCase()));
      hasCache = true;
    }
    if (
      d.type === 'insta-sanitizer:set-strict' &&
      typeof d.payload === 'boolean'
    ) {
      STRICT = d.payload;
    }
  });

  // ---- helpers --------------------------------------------------------------
  const FEED_FRIENDLY =
    /(PolarisFeedRootQuery|PolarisFeedRootPaginationQuery)/i;

  function readHeaderLike(init, key) {
    if (!init) return '';
    if (init.headers) {
      const h = init.headers;
      if (typeof h.get === 'function') return h.get(key) || '';
      const v =
        h[key] ||
        h[key.toLowerCase()] ||
        h[key.replace(/(^|-)./g, (s) => s.toLowerCase())] ||
        '';
      return v || '';
    }
    return '';
  }

  function readBodyField(init, field) {
    if (!init || typeof init.body !== 'string') return '';
    const m = new RegExp(`${field}=([^&]+)`, 'i').exec(init.body);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function isFeedRequest(url, init) {
    if (!url.includes('/graphql/query')) return false;
    const friendly =
      readHeaderLike(init, 'x-fb-friendly-name') ||
      readBodyField(init, 'x-fb-friendly-name');
    return FEED_FRIENDLY.test(friendly);
  }

  // Find the timeline array
  function getEdgesRoot(json) {
    const d = json && json.data;
    if (!d) return null;

    const candidates = [
      'xdt_api__v1__feed__timeline__connection',
      'xdt_api__v1__feed__timeline',
      'user_feed_timeline',
      'feed_timeline',
    ];
    for (const k of candidates) {
      if (d[k]?.edges) return { parent: d[k], key: 'edges' };
      if (d[k]?.items) return { parent: d[k], key: 'items' };
    }
    if (d.xdt_api__v1__feed__timeline__connection?.media?.edges) {
      return {
        parent: d.xdt_api__v1__feed__timeline__connection.media,
        key: 'edges',
      };
    }
    return null;
  }

  const usernameOf = (node) =>
    (node?.user?.username || node?.owner?.username || '').toLowerCase();

  // Explicit suggestions/ads (cheap string checks)
  function nodeIsSuggestedOrAd(node) {
    const t = JSON.stringify(node).toLowerCase();
    if (t.includes('"is_suggested":true')) return true;
    if (t.includes('"suggested"')) return true;
    if (t.includes('"sponsored"')) return true;
    if (t.includes('"is_ad"')) return true;
    if (t.includes('"ad_')) return true;
    if (t.includes('"social_context"')) return true;
    return false;
  }

  // True if we can tell this node is from someone you follow (flags or cache)
  function nodeIsFromFollowed(node) {
    if (!node) return false;
    if (node.user?.followed_by_viewer === true) return true;
    if (node.owner?.followed_by_viewer === true) return true;

    const fs =
      node.user?.friendship_status ||
      node.owner?.friendship_status ||
      node.friendship_status;
    if (fs?.following === true) return true;

    if (node.user?.viewer_follows === true) return true;
    if (node.viewer_is_following === true) return true;

    const u = usernameOf(node);
    if (u && FOLLOW.has(u)) return true;

    return false;
  }

  function filterFeedJson(json) {
    const root = getEdgesRoot(json);
    if (!root) return false;

    const arr = root.parent[root.key];
    const before = Array.isArray(arr) ? arr.length : 0;
    if (!before) return false;

    const learned = new Set();

    const kept = arr.filter((edge) => {
      const node = edge?.node || edge?.media || edge;

      // Always drop ads/suggestions
      if (nodeIsSuggestedOrAd(node)) return false;

      // Learn followed authors when the JSON is explicit
      if (
        node?.user?.followed_by_viewer === true ||
        node?.owner?.followed_by_viewer === true
      ) {
        const u = usernameOf(node);
        if (u) learned.add(u);
      }

      const isFollow = nodeIsFromFollowed(node);

      if (STRICT) {
        // If we have no cache yet, be lenient to avoid a blank feed
        if (!hasCache) return true;
        // Strict = keep only followed/known
        return !!isFollow;
      } else {
        // Non-strict = keep unless explicitly an ad/suggestion (already filtered)
        return true;
      }
    });

    if (learned.size) {
      // Tell content world to persist these usernames
      window.postMessage(
        { type: 'insta-sanitizer:learn-follow', payload: Array.from(learned) },
        '*'
      );
    }

    root.parent[root.key] = kept;
    return kept.length !== before;
  }

  // ---- fetch patch ----------------------------------------------------------
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';

    if (!isFeedRequest(url, init)) {
      return _fetch.apply(this, arguments);
    }

    return _fetch.apply(this, arguments).then(async (res) => {
      try {
        const ct = res.headers?.get?.('content-type') || '';
        if (!ct.includes('application/json')) return res;

        const clone = res.clone();
        const text = await clone.text();
        const json = JSON.parse(text);

        const changed = filterFeedJson(json);
        if (!changed) return res;

        const body = JSON.stringify(json);
        const headers = new Headers(res.headers || {});
        headers.set('content-type', 'application/json; charset=utf-8');

        return new Response(body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      } catch {
        return res;
      }
    });
  };
})();
