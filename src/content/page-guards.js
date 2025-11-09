// src/content/page-guards.js
(() => {
  let ENABLED = false;

  function shouldBlock(url, init) {
    if (!ENABLED) return false;
    try {
      if (!url || !url.includes('/graphql/query')) return false;

      // Read markers from headers or body
      let friendly = '',
        rootname = '';
      if (init && init.headers) {
        if (typeof init.headers.get === 'function') {
          friendly = init.headers.get('x-fb-friendly-name') || '';
          rootname = init.headers.get('x-root-field-name') || '';
        } else if (typeof init.headers === 'object') {
          const h = init.headers;
          friendly = h['x-fb-friendly-name'] || h['X-FB-Friendly-Name'] || '';
          rootname = h['x-root-field-name'] || h['X-Root-Field-Name'] || '';
        }
      }
      const body = init && typeof init.body === 'string' ? init.body : '';
      if (!friendly && /x-fb-friendly-name=([^&]+)/i.test(body))
        friendly = decodeURIComponent(RegExp.$1 || '');
      if (!rootname && /x-root-field-name=([^&]+)/i.test(body))
        rootname = decodeURIComponent(RegExp.$1 || '');

      // Narrow match — this is the one you saw
      if (/PolarisFeedRootPaginationCachedQuery_subscribe/i.test(friendly))
        return true;
      return false;
    } catch {
      return false;
    }
  }

  // Patch fetch
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (shouldBlock(url, init)) {
      return Promise.resolve(
        new Response('{"data":{}}', {
          status: 204,
          headers: { 'content-type': 'application/json' },
        })
      );
    }
    return _fetch.apply(this, arguments);
  };

  // Patch XHR (belt + suspenders)
  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__url = url;
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (
        typeof this.__url === 'string' &&
        this.__url.includes('/graphql/query')
      ) {
        const init = { body: typeof body === 'string' ? body : '' };
        if (shouldBlock(this.__url, init)) {
          this.abort();
          return;
        }
      }
    } catch {}
    return XS.apply(this, arguments);
  };

  // Enable/disable from the content script
  window.addEventListener('message', (ev) => {
    if (!ev || !ev.data) return;
    if (ev.data.type === 'insta-sanitizer:enable-suggest-block') ENABLED = true;
    if (ev.data.type === 'insta-sanitizer:disable-suggest-block')
      ENABLED = false;
  });
})();
