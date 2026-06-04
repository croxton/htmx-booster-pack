export default class BoosterExt {

  constructor(factoryClass, extension) {

    if (!/^[a-zA-Z][\w-]*$/.test(extension)) {
      throw new Error(`Booster Pack: invalid extension name "${extension}".`);
    }

    let factory;

    const parser = new DOMParser();

    let cache = {
      now: Object.create(null),
      next: Object.create(null),
      hit: false,
      clean: true
    };

    function parseHTML(html) {
      if (!html) {
        return null;
      }

      return parser.parseFromString(html, 'text/html');
    }

    function createCacheStore() {
      return Object.create(null);
    }

    function saveToCache(dom, store) {
      // Support [hx-history-preserve] as well as booster components
      const markers = dom.querySelectorAll(
        `[data-${extension}]:not([data-reset="false"]), [hx-history-preserve]:not([data-reset="false"])`
      );

      for (const marker of markers) {
        if (marker.id) {
          cache[store][marker.id] = marker.outerHTML;
        }
      }
    }

    function rotateCache() {
      // Prune cache of any markers not found in the current document
      const prunedCache = createCacheStore();

      for (const key in cache.now) {
        if (document.getElementById(key)) {
          prunedCache[key] = cache.now[key];
        }
      }

      cache.now = prunedCache;

      // Merge incoming cache, ready for the next history save
      if (Object.keys(cache.next).length > 0) {
        cache.now = {
          ...cache.now,
          ...cache.next,
        };

        cache.next = createCacheStore();
      }
    }

    htmx.defineExtension(extension, {
      init: function() {
        factory = new factoryClass(extension);
        factory.mounted = true;

        // On page load, cache the initial dom state of preserved
        // elements before they are manipulated by JS
        function initCache() {
          saveToCache(document, 'now');
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initCache, { once: true });
        } else {
          initCache();
        }
      },
      onEvent: function(name, htmxEvent) {
        switch (name) {
          case 'htmx:beforeSwap': {
            // On swap, save the initial DOM state of any preserved
            // elements in the incoming DOM.
            // We won't need this until the next request that
            // triggers a history save.
            const incomingDOM = parseHTML(htmxEvent?.detail?.xhr?.response);

            if (incomingDOM) {
              saveToCache(incomingDOM, 'next');
            }

            // Cleanup
            factory?.beforeUnmount?.();
            cache.clean = false;

            break;
          }

          case 'htmx:afterSettle':
            htmx.config.currentTargetId = htmxEvent.target?.id || 'main';
            factory?.refresh?.();
            cache.clean = true;
            break;

          case 'htmx:beforeHistorySave':

            // Cleanup if not already done in htmx:beforeSwap.
            // This is a fallback because htmx:beforeSwap is not called
            // on history restores
            if (cache.clean) {
              factory?.beforeUnmount?.();
            }

            break;

          case 'htmx:historyItemCreated': {
            if (!htmxEvent.detail.item.content) {
              break;
            }

            // Overwrite content with our restored markup
            // before it is saved to the history cache.
            const cachedDOM = parseHTML(htmxEvent.detail.item.content);

            if (!cachedDOM) {
              break;
            }

            for (const key in cache.now) {
              const el = cachedDOM.getElementById(key);

              if (el) {
                el.outerHTML = cache.now[key];
              }
            }

            htmxEvent.detail.item.content = cachedDOM.body.innerHTML;

            // Rotate cache for next time
            rotateCache();
            break;
          }

          case 'htmx:historyCacheHit':
            // Event only exists in >= htmx 2.0.5
            cache.hit = true;

            break;

          case 'htmx:historyRestore': {
            htmx.config.currentTargetId = null;

            if (!cache.hit) {
              // Support for older versions of htmx which don't trigger
              // htmx:afterSettle on history restore
              factory?.refresh?.();
            }

            cache.hit = false;

            // Update the cache of preserved elements that will be
            // restored on the next request that triggers a history save.
            const restored = htmxEvent?.detail?.item?.content;
            const restoredDOM = parseHTML(restored);

            if (restoredDOM) {
              saveToCache(restoredDOM, 'now');
            }

            break;
          }

          default:
            break;
        }
      },
    });
  }
}
