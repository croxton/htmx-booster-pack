/**
 * Booster Pack extension
 *
 * @author Mark Croxton, Hallmark Design
 */

/* ================================================================ */
/* Base component class                                             */
/* ================================================================ */

class Booster {
  mounted = false;
  elm = null;
  target = null;
  _state = {};

  constructor(element = '', options = {}) {
    this._options = options || {};
    if (element) {
      this.elm = element;
    }
  }

  get options() {
    return this._options;
  }

  set options(defaults) {
    let options = {};
    if (this.elm) {
      let mount = document.querySelector(this.elm);
      if (mount) {
        let optionsFromAttribute = mount.dataset.options;
        if (optionsFromAttribute) {
          options = JSON.parse(optionsFromAttribute);
        }
        mount = null;
      }
    }
    this._options = {
      ...this._options,
      ...defaults,
      ...options,
    };
  }

  mount() {
  }

  unmount() {
  }

  refresh() {
    this.unmount();
    this.mount();
  }

  get state() {
    console.warn('You should not get state manually. Use getState() instead.');
    return this._state;
  }

  set state(state) {
    console.warn('You should not change state manually. Use setState() instead.');
    this._state = state;
  }

  setState(scope = "local", changes) {
    let stateChanges = {};
    let stateRef = this._state;
    if (scope === 'global') {
      stateRef = Booster._globalState;
    } else if (scope === 'component') {
      if (!Booster._globalState.hasOwnProperty(this.constructor.name)) {
        Booster._globalState[this.constructor.name] = {};
      }
      stateRef = Booster._globalState[this.constructor.name];
    }

    Object.keys(changes).forEach(key => {
      if (Array.isArray(changes[key])) {
        if (stateRef[key] != null && Array.isArray(stateRef[key])) {
          if (stateRef[key].length === changes[key].length) {
            changes[key].some((item, index) => {
              if (stateRef[key][index] !== item) {
                stateChanges[key] = changes[key];
                stateRef[key] = stateChanges[key];
                return true;
              }
              return false;
            });
          } else {
            stateChanges[key] = changes[key];
            stateRef[key] = stateChanges[key];
          }
        } else {
          stateChanges[key] = changes[key];
          stateRef[key] = stateChanges[key];
        }
      } else if (typeof changes[key] === 'object') {
        if (stateRef[key] != null && typeof stateRef[key] === 'object') {
          stateChanges[key] = {};
          Object.keys(changes[key]).forEach(subkey => {
            if (stateRef[key][subkey] !== changes[key][subkey]) {
              stateChanges[key][subkey] = changes[key][subkey];
            }
          });
        } else {
          stateChanges[key] = changes[key];
        }

        stateRef[key] = {
          ...stateRef[key],
          ...stateChanges[key],
        };
      } else {
        if (stateRef !== changes[key]) {
          stateChanges[key] = changes[key];
          stateRef[key] = changes[key];
        }
      }
    });

    Object.keys(stateChanges).forEach(key => {
      if (Array.isArray(changes[key])) {
        if (stateChanges[key].length === 0) {
          delete stateChanges[key];
        }
      } else if (typeof changes[key] === 'object') {
        if (Object.keys(stateChanges[key]).length === 0) {
          delete stateChanges[key];
        }
      }
    });

    stateRef = null;
    this.stateChange(stateChanges);
  }

  stateChange(changes) {
    // this is here only to be rewritten
  }

  getState(scope = "local", defaults = {}) {
    let stateRef = this._state;
    if (scope === 'global') {
      stateRef = Booster._globalState;
    } else if (scope === 'component') {
      if (Booster._globalState.hasOwnProperty(this.constructor.name)) {
        stateRef = Booster._globalState[this.constructor.name];
      } else {
        stateRef = {};
      }
    }
    return {
      ...defaults,
      ...stateRef
    }
  }

  destroyState(scope = "local") {
    if (scope === 'global') {
      Booster._globalState = {};
    } else if (scope === 'component') {
      if (Booster._globalState.hasOwnProperty(this.constructor.name)) {
        Booster._globalState[this.constructor.name] = {};
      }
    } else {
      this._state = {};
    }
  }

  css(urls) {
    return Promise.all(urls.map(this._loadCSS));
  }

  _loadCSS(href) {
    return new Promise(resolve => {
      if (Booster._sheets.includes(href)) {
        return resolve();
      } else {
        Booster._sheets.push(href);
      }
      let link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.onload = resolve;
      link.setAttribute("href", href);
      document.head.appendChild(link);
    });
  }
}

Object.defineProperty(Booster, '_sheets', {
  value: [],
  writable: true
});

Object.defineProperty(Booster, '_globalState', {
  value: {},
  writable: true
});

(function () {

  /* ================================================================ */
  /* Config                                                           */
  /* ================================================================ */
  let config = {
    origin: location.origin,
    basePath : 'scripts/boosts'
  }
  let configMeta = document.querySelector('meta[name="booster-config"]')?? null;
  if (configMeta) {
    config = {
      ...config,
      ...JSON.parse(configMeta.content)
    };
  }
  // trim slashes from basePath
  config.basePath = config.basePath.replace(/^\/|\/$/g, '');

  /* ================================================================ */
  /* Load strategies                                                  */
  /* ================================================================ */
  const event = (requirement) => {
    return new Promise((resolve) => {
      // get the topic provided
      let topic;
      if (requirement.indexOf('(') !== -1) {
        const topicStart = requirement.indexOf('(') + 1;
        topic = requirement.slice(topicStart, -1);
      }
      if (topic) {
        document.body.addEventListener(
          topic,
          () => {
            resolve();
          },
          { once: true }
        );
      } else {
        resolve(); // no topic provided, resolve immediately
      }
    });
  };

  const idle = () => {
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(resolve);
      } else {
        setTimeout(resolve, 200);
      }
    });
  };

  const media = (requirement) => {
    return new Promise((resolve) => {
      const queryStart = requirement.indexOf('(');
      const query = requirement.slice(queryStart);
      const mediaQuery = window.matchMedia(query);
      if (mediaQuery.matches) {
        resolve();
      } else {
        mediaQuery.addEventListener('change', resolve, { once: true });
      }
    });
  };

  const visible = (selector = null, requirement) => {
    if (selector) {
      return new Promise((resolve) => {
        // work out if a rootMargin has been specified,
        // and if so take it from the requirement
        let rootMargin = '0px 0px 0px 0px';
        if (requirement.indexOf('(') !== -1) {
          const rootMarginStart = requirement.indexOf('(') + 1;
          rootMargin = requirement.slice(rootMarginStart, -1);
        }

        const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                observer.disconnect();
                resolve();
              }
            },
            { rootMargin }
        );

        // observe element
        let elm = document.querySelector(selector);
        if (elm) {
          observer.observe(elm);
        } else {
          resolve(); // no element matched, resolve immediately
        }
      });
    } else {
      // no element to observe so resolve immediately
      return Promise.resolve(true);
    }
  };

  const strategies = {
    event,
    idle,
    media,
    visible,
  };

  function loadStrategies(strategy, selector) {
    let promises = [];

    // custom import strategies
    if (strategy) {
      // support multiple strategies separated by pipes
      // e.g. "idle | visible | media (min-width: 1024px)"
      let requirements = strategy
          .split('|')
          .map((requirement) => requirement.trim())
          .filter((requirement) => requirement !== 'immediate')
          .filter((requirement) => requirement !== 'eager');

      for (let requirement of requirements) {
        // event listener, pass the event inside parentheses
        // e.g."event (htmx:afterSettle)"
        if (requirement.startsWith('event')) {
          promises.push(strategies.event(requirement));
          continue;
        }

        // idle using requestIdleCallback
        if (requirement === 'idle') {
          promises.push(strategies.idle());
          continue;
        }

        // media query, pass the rule inside parentheses
        // e.g."media (only screen and (min-width:768px))"
        if (requirement.startsWith('media')) {
          promises.push(strategies.media(requirement));
          continue;
        }

        // visible using intersectionObserver, optionally pass the
        // root margins of the observed element inside parentheses
        // e.g."visible (0px 0px 0px 0px)"
        if (requirement.startsWith('visible')) {
          promises.push(strategies.visible(selector, requirement));
        }
      }
    }

    return promises;
  }

  /* ================================================================ */
  /* Component factory                                                */
  /* ================================================================ */
  class componentFactory extends Booster {
    loaded = [];

    constructor() {
      super();
      this.mount();
    }

    mount() {
      // Create a new instance for component placeholders
      // found in the swap target only, allowing components in parts of the
      // page *outside* the swap target to remain unchanged.
      let targetId = htmx.config.currentTargetId ?? 'main'; // default
      let target = document.getElementById(targetId);
      if (target) {
        let components = target.querySelectorAll('[data-booster]');
        for (let el of components) {
          // load on demand
          this.lazyload(el);
        }
        target = null;
        components = null;
      }
    }

    unmount() {
      let targetId = htmx.config.currentTargetId ?? 'main'; // default
      let target = document.getElementById(targetId);
      if (target) {
        for (let i = this.loaded.length - 1; i >= 0; i--) {
          // 1. unmount if it IS in the swap target (it will be re-mounted)
          // 2. unmount if it IS NOT in the document at all
          let inTarget = target.querySelector(this.loaded[i].selector);
          let inDocument = document.querySelector(this.loaded[i].selector);
          if (inTarget || !inDocument) {
            this.loaded[i].instance.unmount();
            this.loaded.splice(i, 1); // remove from array
          }
        }
        target = null;
      }
    }

    /**
     * Import a component on demand, optionally using a loading strategy
     *
     * @param el
     */
    lazyload(el) {
      let component = el.dataset.booster;
      let version = el.dataset.version ?? '1';
      let strategy = el.dataset.load ?? null;
      let selector = el.getAttribute('id')
          ? '#' + el.getAttribute('id')
          : '[data-booster="' + component + '"]';
      let promises = loadStrategies(strategy, selector);

      Promise.all(promises).then(() => {
        // mount the component instance
        import(/* @vite-ignore */ `${config.origin}/${config.basePath}/${component}.js?v=${version}`).then(
          (lazyComponent) => {
            let instance = new lazyComponent.default(selector);
            instance.mounted = true;
            this.loaded.push({
              name: component,
              selector: selector,
              instance: instance,
            });
          }
        );
      });
    }
  }

  /* ================================================================ */
  /* History cache                                                    */
  /* ================================================================ */
  let cache = {
    now: {},
    next: {},
  };

  function saveToCache(dom, store) {
    let markers = dom.querySelectorAll('[data-booster]:not([data-reset="false"])');
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

  /* ================================================================ */
  /* HTMX extension                                                   */
  /* ================================================================ */
  let factory;
  htmx.defineExtension('booster', {
    init: function () {
      factory = new componentFactory();
      factory.mounted = true;
      // On page load, cache the initial dom state of preserved
      // elements before they are manipulated by JS
      saveToCache(document, 'now');
    },
    onEvent: function (name, htmxEvent) {

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

      if (name === 'htmx:afterSwap') {
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
})();

/* ================================================================ */
/* Helpers                                                          */
/* ================================================================ */

// Adapted from: https://www.npmjs.com/package/geteventlisteners
(function () {
  'use strict';

  // save the original methods before overwriting them
  Element.prototype._addEventListener = Element.prototype.addEventListener;
  Element.prototype._removeEventListener =
      Element.prototype.removeEventListener;

  /**
   * [addEventListener description]
   * @param {[type]}  type       [description]
   * @param {[type]}  listener   [description]
   * @param {Boolean} useCapture [description]
   */
  Element.prototype.addEventListener = function (
      type,
      listener,
      useCapture = false
  ) {
    // declare listener
    this._addEventListener(type, listener, useCapture);

    if (!this.eventListenerList) this.eventListenerList = {};
    if (!this.eventListenerList[type]) this.eventListenerList[type] = [];

    // add listener to  event tracking list
    this.eventListenerList[type].push({ type, listener, useCapture });
  };

  /**
   * [removeEventListener description]
   * @param  {[type]}  type       [description]
   * @param  {[type]}  listener   [description]
   * @param  {Boolean} useCapture [description]
   * @return {[type]}             [description]
   */
  Element.prototype.removeEventListener = function (
      type,
      listener,
      useCapture = false
  ) {
    // remove listener
    this._removeEventListener(type, listener, useCapture);

    if (!this.eventListenerList) {
      this.eventListenerList = {};
    }
    if (!this.eventListenerList[type]) {
      this.eventListenerList[type] = [];
    }

    // Find the event in the list, If a listener is registered twice, one
    // with capture and one without, remove each one separately. Removal of
    // a capturing listener does not affect a non-capturing version of the
    // same listener, and vice versa.
    for (let i = 0; i < this.eventListenerList[type].length; i++) {
      if (
          this.eventListenerList[type][i].listener === listener &&
          this.eventListenerList[type][i].useCapture === useCapture
      ) {
        this.eventListenerList[type].splice(i, 1);
        break;
      }
    }
    // if no more events of the removed event type are left,remove the group
    if (this.eventListenerList[type].length === 0) {
      delete this.eventListenerList[type];
    }
  };

  /**
   * [getEventListeners description]
   * @param  {[type]} type [description]
   * @return {[type]}      [description]
   */
  Element.prototype.getEventListeners = function (type) {
    if (!this.eventListenerList) this.eventListenerList = {};

    // return requested listeners type or all them
    if (type === undefined) {
      return this.eventListenerList;
    }
    return this.eventListenerList[type];
  };

  Element.prototype.clearEventListeners = function (a) {
    if (!this.eventListenerList) this.eventListenerList = {};
    if (a === undefined) {
      for (let x in this.getEventListeners()) {
        this.clearEventListeners(x);
      }
      return;
    }
    const el = this.getEventListeners(a);
    if (el === undefined) {
      return;
    }
    for (let i = el.length - 1; i >= 0; --i) {
      let ev = el[i];
      this.removeEventListener(a, ev.listener, ev.useCapture);
    }
  };
})();
