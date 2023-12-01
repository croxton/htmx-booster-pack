/**
 * htmx components extension
 *
 * @author Mark Croxton, Hallmark Design
 *
 * How to use:
 *
 * 1. Include this script in your page, after htmx.js
 * <script src="/path/to/ext/components.js" defer></script>
 *
 * 2. Create a `components` directory at the same level as the extensions directory
 * script, e.g. /path/to/components/
 *
 * 3. Add components as ES6 classes that extend HtmxComponent and implement
 *  `mount()` and `unmount()` methods:
 *  E.g. /path/to/ext/components/myThing.js
 export default class MyThing extends HtmxComponent {
        constructor(elm) {
            super(elm);
                this.mount();
        }
        mount() {}
        unmount() {}
    }
 *
 * 4. In your HTML:
 <div data-component="myThing"
 data-load="media (min-width: 1024px)"
 data-options="{"option1":"value1", "option2":"value2"}">
 </div>
 *
 */

/* ================================================================ */
/* Base component class                                             */
/* ================================================================ */
class HtmxComponent {
  mounted = false;
  elm = null;
  target = null;

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

  mount() {}

  unmount() {}

  refresh() {
    this.unmount();
    this.mount();
  }
}

(function () {

  /* ================================================================ */
  /* Config                                               */
  /* ================================================================ */
  let config = {
    origin: location.origin,
    basePath : 'scripts/components'
  }
  let configMeta = document.querySelector('meta[name="htmx-components-config"]')?? null;
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
  class componentFactory extends HtmxComponent {
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
        let components = target.querySelectorAll('[data-component]');
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
      let component = el.dataset.component;
      let version = el.dataset.version ?? '1';
      let strategy = el.dataset.load ?? null;
      let selector = el.getAttribute('id')
          ? '#' + el.getAttribute('id')
          : '[data-component="' + component + '"]';
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
  /* HTMX extension                                                   */
  /* ================================================================ */

  let factory;
  htmx.defineExtension('components', {
    init: function () {
      factory = new componentFactory();
      factory.mounted = true;
    },
    onEvent: function (name, htmxEvent) {
      if (name === 'htmx:afterSwap') {
        htmx.config.currentTargetId = htmxEvent.target.id;
        factory.refresh();
      }
      if (name === 'htmx:historyRestore') {
        htmx.config.currentTargetId = null;
        factory.refresh();
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
