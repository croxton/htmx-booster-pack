import Booster from './booster.js';
import {loadStrategies} from './loadStrategies.js';

export default class BoosterFactory extends Booster {
    loaded = [];
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

    beforeUnmount() {
        const target = this._getTarget();

        if (!target) {
            return;
        }

        for (let i = this.loaded.length - 1; i >= 0; i--) {
            // Call beforeUnmount() on the component if it is within the target that is about to be swapped
            const loadedComponent = this.loaded[i];
            const inTarget = target.querySelector(loadedComponent.selector);
            if (inTarget) {
                loadedComponent.instance.beforeUnmount?.();
            }
        }

    }

    unmount() {
        const target = this._getTarget();

        if (!target) {
          return;
        }

        for (let i = this.loaded.length - 1; i >= 0; i--) {
            // 1. Call unmount() on the component if it is within the swap target (it will be re-mounted)
            // 2. Call unmount() on the component if it is NOT in the document at all
            const loadedComponent = this.loaded[i];
            const inTarget = target.querySelector(loadedComponent.selector);
            const inDocument = document.querySelector(loadedComponent.selector);

            if (inTarget || !inDocument) {
                loadedComponent.instance.unmount?.();
                this.loaded.splice(i, 1);
            }
        }
    }

    /**
     * Import a component on demand, optionally using a loading strategy
     *
     * @param el
     */
    lazyload(el) {
        const component = el.dataset[this.extension];
        const version = el.dataset.version ?? '1';
        const strategy = el.dataset.load ?? null;
        const id = el.getAttribute('id');

        if (!component) {
          console.warn(`Booster Pack: missing component name for data-${this.extension}. Skipping.`);
          return;
        }

        if (!id) {
          console.warn(`Booster Pack: an instance of ${component} doesn't have an ID attribute. Skipping.`);
          return;
        }

        const selector = `#${CSS.escape(id)}`;

        // prevent duplicate component instances for the same dom element
        if (this.loaded.some((item) => item.selector === selector)) {
          return;
        }

        const promises = loadStrategies(strategy, selector);

        // mount the component instance
        Promise.all(promises)
            .then(() => import(/* @vite-ignore */ `${this.config.origin}/${this.config.basePath}/${component}.js?v=${version}`))
            .then((lazyComponent) => {
                const ComponentClass = lazyComponent.default;

                if (typeof ComponentClass !== 'function') {
                  throw new TypeError(`Booster Pack: component ${component} does not export a default class.`);
                }

                const instance = new ComponentClass(selector);
                instance.mounted = true;

                this.loaded.push({
                    name: component,
                    selector,
                    instance,
                });
            })
            .catch((error) => {
                console.error(`Booster Pack: failed to load component ${component}.`, error);
            });
    }

    _getTarget() {
      const targetId = htmx.config.currentTargetId ?? 'main'; // default
      return document.getElementById(targetId);
    }
}