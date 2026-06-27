import Booster from './booster.js';
import {loadStrategies} from './loadStrategies.js';

export default class BoosterFactory extends Booster {
  loaded = [];
  loading = [];
  config = {};
  extension = '';

  constructor(extension='booster') {
    super();

    this.extension = extension;

    this.config = {
      origin: location.origin,
      basePath : 'scripts/boosts'
    }
    const configMeta = document.querySelector(`meta[name="${this.extension}-config"]`);
    if (configMeta?.content) {
      try {
        this.config = {
          ...this.config,
          ...JSON.parse(configMeta.content),
        };
      } catch (error) {
        console.warn(
          `Booster Pack: invalid JSON in ${this.extension}-config meta tag. Using defaults.`,
          error,
        );
      }
    }
    // trim slashes from basePath
    this.config.basePath = this.config.basePath.replace(/^\/|\/$/g, '');

    this.mount();
  }

  /**
   * Discover and lazy-load component placeholders in the current swap target.
   *
   * Finds elements within the active htmx target that use this extension's
   * data attribute, then passes each matching element to `lazyload()`.
   * Components outside the current target are intentionally ignored so they
   * can remain mounted across swaps.
   *
   * @returns {void}
   */
  mount() {
    // Create a new instance for component placeholders
    // found in the swap target only, allowing components in parts of the
    // page *outside* the swap target to remain unchanged.
    const target = this._getTarget();
    if (!target) {
      return;
    }

    const components = target.querySelectorAll(`[data-${this.extension}]`);

    for (const el of components) {
      // load on demand
      this.lazyload(el);
    }
  }

  /**
   * Run pre-unmount lifecycle hooks for components inside the current swap target.
   *
   * Before htmx swaps content out of the document, this calls each affected
   * component's optional `beforeUnmount()` hook. This gives components a chance
   * to perform DOM-dependent cleanup while their elements are still present.
   *
   * @returns {void}
   */
  beforeUnmount() {
    const target = this._getTarget();

    if (!target) {
      return;
    }

    for (let i = this.loaded.length - 1; i >= 0; i--) {
      // Call beforeUnmount() on the component if it is within the target that is about to be swapped
      const loadedComponent = this.loaded[i];
      const inTarget = this._isWithinTarget(target, loadedComponent.selector);
      if (inTarget) {
        loadedComponent.instance.beforeUnmount?.();
      }
    }
  }

  /**
   * Unmount components affected by the current htmx swap target.
   *
   * Calls each mounted component's `unmount()` lifecycle hook when its
   * element is either inside the current swap target or no longer present
   * in the document. Matching mounted components are removed from the
   * loaded registry and a `booster:detached` event is published.
   *
   * Also publishes `booster:detached` for components that were still
   * waiting on a loading strategy when they became detached.
   *
   * @returns {void}
   */
  unmount() {
    const target = this._getTarget();

    if (!target) {
      return;
    }

    // mounted components that are no longer in the swap target
    for (let i = this.loaded.length - 1; i >= 0; i--) {
      // 1. Call unmount() on the component if it is within the swap target (it will be re-mounted)
      // 2. Call unmount() on the component if it is NOT in the document at all
      const loadedComponent = this.loaded[i];
      const inTarget = this._isWithinTarget(target, loadedComponent.selector);
      const inDocument = document.querySelector(loadedComponent.selector);

      if (inTarget || !inDocument) {
        loadedComponent.instance.unmount?.();
        this.loaded.splice(i, 1);
        this.publish("booster:detached",  {
          selector: loadedComponent.selector,
          target: target
        });
      }
    }

    // unmounted components that are still loading
    for (let i = this.loading.length - 1; i >= 0; i--) {
      const selector = this.loading[i];
      const inTarget = this._isWithinTarget(target, selector);
      const inDocument = document.querySelector(selector);
      if (inTarget || !inDocument) {
        this.publish("booster:detached",  {
          selector: selector,
          target: target
        });
      }
    }
    this.loading = [];
  }

  /**
   * Emit a custom event
   *
   * @param eventName
   * @param detail
   */
  publish(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Load and mount a component for the given DOM element.
   *
   * Reads the component name, loading strategy, and cache-busting version
   * from the element's data attributes. The component module is imported
   * only after all configured loading strategies have resolved.
   *
   * Duplicate loads are prevented by checking both mounted and in-progress
   * component selectors.
   *
   * @param {HTMLElement} el The element with the data attribute for this Booster extension.
   * @returns {void}
   */
  lazyload(el) {
    const component = el.dataset[this.extension];
    const id = el.getAttribute('id');
    const strategy = el.dataset.load ?? null;
    const version = el.dataset.version ?? '1';

    if (!this._isValidComponent(component, id, strategy, version)) {
      return;
    }

    const selector = `#${CSS.escape(id)}`;

    // prevent duplicate component instances for the same dom element
    if (
      this.loaded.some((item) => item.selector === selector) ||
      this.loading.includes(selector)
    ) {
      return;
    }
    this.loading.push(selector);

    const promises = loadStrategies(strategy, selector);

    // mount the component instance
    Promise.all(promises)
      .then(() => {
        if (!document.querySelector(selector)) {
          return null;
        }
        const url = new URL(`${this.config.basePath}/${component}.js`, this.config.origin);
        url.searchParams.set('v', version);
        return import(/* @vite-ignore */ url.href);
      })
      .then((lazyComponent) => {
        const instance = this.mountComponent(lazyComponent, component, selector);
        if (instance) {
          this.loaded.push({
            name: component,
            selector,
            instance,
          });
        }
      })
      .catch((error) => {
        console.error(`Booster Pack: failed to load component ${component}.`, error);
      })
      .finally(() => {
        this.loading = this.loading.filter(item => !(item === selector));
      });
  }

  /**
   * Mount a dynamically imported component instance.
   *
   * @param {object|null} module The imported component module.
   * @param {string} component The component name, used for error messages.
   * @param {string} selector The selector for the component element.
   * @returns {object|false} The mounted component instance, or false when it cannot be mounted.
   */
  mountComponent(module, component, selector) {

    if (!module) {
      return false;
    }
    const ComponentClass = module.default;

    // Do we have a default export?
    if (typeof ComponentClass !== 'function') {
      throw new TypeError(`Booster Pack: component ${component} does not export a default class.`);
    }

    // Component is still in the dom after waiting for load strategy?
    if (!document.querySelector(selector)) {
      return false;
    }

    const instance = new ComponentClass(selector);
    instance.mounted = true;
    try {
      instance.mount?.();
    } catch (error) {
      instance.mounted = false;
      throw error;
    }

    return instance;
  }

  /**
   * Validate component metadata before attempting to load it.
   *
   * @param {string|null|undefined} component The component name from the data attribute.
   * @param {string|null|undefined} id The ID of the DOM element the component is attached to.
   * @param {string|null} [strategy=''] The optional loading strategy, e.g. "idle", "visible", or "idle | media (min-width: 1024px)".
   * @param {string} [version='1'] The optional alphanumeric version string used for cache busting.
   * @returns {boolean} True when the component metadata is valid; otherwise false.
   */
  _isValidComponent(component, id, strategy='', version='1') {

    if (!component) {
      console.warn(`Booster Pack: missing component name for data-${this.extension}. Skipping.`);
      return false;
    }

    if (!/^[A-Za-z0-9]+$/.test(component)) {
      console.warn(`Booster Pack: invalid component name "${component}". Skipping.`);
      return false;
    }

    if (!id) {
      console.warn(`Booster Pack: an instance of ${component} doesn't have an ID attribute. Skipping.`);
      return false;
    }

    if (strategy && !/^(?:eager|immediate|idle|event\s*\([^)]*\)|media\s*\([^)]*\)|visible(?:\s*\([^)]*\))?)(?:\s*\|\s*(?:eager|immediate|idle|event\s*\([^)]*\)|media\s*\([^)]*\)|visible(?:\s*\([^)]*\))?))*$/.test(strategy)) {
      console.warn(`Booster Pack: invalid loading strategy for ${component}. Skipping.`);
      return false;
    }

    if (!/^[A-Za-z0-9]+$/.test(version)) {
      console.warn(`Booster Pack: invalid version string for "${component}". Skipping.`);
      return false;
    }

    return true;
  }

  /**
   * Get the current swap target
   */
  _getTarget() {
    const targetId = htmx.config.currentTargetId ?? 'main'; // default
    return document.getElementById(targetId);
  }

  /**
   * Check if a component is within the swap target
   *
   * @param target The swap target
   * @param selector The component selector
   */
  _isWithinTarget(target, selector) {
    return target.matches(selector) || Boolean(target.querySelector(selector));
  }
}