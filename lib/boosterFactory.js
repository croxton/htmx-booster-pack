import Booster from './booster.js';
import {loadStrategies} from './loadStrategies.js';

export default class BoosterFactory extends Booster {
    loaded = [];
    config = {};
    extension = 'booster'; // default

    constructor(extension) {
        super();
        this.extension = extension;

        this.config = {
            origin: location.origin,
            basePath : 'scripts/boosts'
        }
        let configMeta = document.querySelector('meta[name="'+this.extension+'-config"]')?? null;
        if (configMeta) {
            this.config = {
                ...this.config,
                ...JSON.parse(configMeta.content)
            };
        }
        // trim slashes from basePath
        this.config.basePath = this.config.basePath.replace(/^\/|\/$/g, '');

        this.mount();
    }

    mount() {
        // Create a new instance for component placeholders
        // found in the swap target only, allowing components in parts of the
        // page *outside* the swap target to remain unchanged.
        let targetId = htmx.config.currentTargetId ?? 'main'; // default
        let target = document.getElementById(targetId);
        if (target) {
            let components = target.querySelectorAll('[data-'+this.extension+']');
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
        let component = el.dataset[this.extension];
        let version = el.dataset.version ?? '1';
        let strategy = el.dataset.load ?? null;
        let selector = el.getAttribute('id')
            ? '#' + el.getAttribute('id')
            : null;
        if (selector === null) {
          return console.warn(`Booster Pack: an instance of ${component} doesn't have an ID attribute. Skipping.`)
        }
        let promises = loadStrategies(strategy, selector);

        Promise.all(promises).then(() => {
            // mount the component instance
            import(/* @vite-ignore */ `${this.config.origin}/${this.config.basePath}/${component}.js?v=${version}`).then(
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