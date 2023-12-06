export default class BoosterExt {

  constructor(factoryClass, extension) {

    let factory;

    let cache = {
      now: {},
      next: {},
    };

    function saveToCache(dom, store) {
      let markers = dom.querySelectorAll('[data-'+extension+']' + ':not([data-reset="false"])');
      if (markers) {
        for (let i = 0; i < markers.length; ++i) {
          if (typeof markers[i].id !== 'undefined') {
            cache[store][markers[i].id] = markers[i].outerHTML;
          }
        }
      }
    }

    function rotateCache() {
      // Prune cache of any markers not found in current document
      let prunedCache = {};
      for (let key in cache.now) {
        let el = document.getElementById(key);
        if (el) {
          prunedCache[key] = cache.now[key];
        }
        el = null;
      }
      cache.now = prunedCache;

      // Merge incoming cache, ready for the next history save
      if (Object.keys(cache.next).length > 0) {
        cache.now = {
          ...cache.now,
          ...cache.next,
        };
        cache.next = {};
      }
    }

    htmx.defineExtension(extension, {
      init: function() {
        factory = new factoryClass(extension);
        factory.mounted = true;
        // On page load, cache the initial dom state of preserved
        // elements before they are manipulated by JS
        saveToCache(document, 'now');
      },
      onEvent: function(name, htmxEvent) {

        if (name === 'htmx:beforeSwap') {
          // On swap, save the initial dom state of any preserved
          // elements in the incoming DOM.
          // We won't need this until the *next* request that
          // triggers a history save
          let incomingDOM = new DOMParser().parseFromString(
            htmxEvent.detail.xhr.response,
            'text/html'
          );
          if (incomingDOM) {
            saveToCache(incomingDOM, 'next');
          }
          incomingDOM = null;
        }

        if (name === 'htmx:afterSettle') {
          htmx.config.currentTargetId = htmxEvent.target.id;
          factory.refresh();
        }

        if (name === 'htmx:historyItemCreated') {
          if (htmxEvent.detail.item.content) {
            // Overwrite content with our restored markup
            // *before* it is saved to the history cache...
            let cachedDOM = new DOMParser().parseFromString(
              htmxEvent.detail.item.content,
              'text/html'
            );
            for (let key in cache.now) {
              let el = cachedDOM.getElementById(key);
              if (el) {
                el.outerHTML = cache.now[key];
              }
              el = null;
            }
            htmxEvent.detail.item.content = cachedDOM.body.innerHTML;

            // Rotate cache for next time
            rotateCache();
          }
        }

        if (name === 'htmx:historyRestore') {

          htmx.config.currentTargetId = null;
          factory.refresh();

          // Update the cache of preserved elements that will be
          // restored on the next request that triggers a history save
          let restored = htmxEvent?.detail?.item?.content;
          if (restored) {
            let restoredDOM = new DOMParser().parseFromString(
              restored,
              'text/html'
            );
            if (restoredDOM) {
              saveToCache(restoredDOM, 'now');
            }
          }
        }
      },
    });
  }
}
