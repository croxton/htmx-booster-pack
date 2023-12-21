import BoosterFactory from './boosterFactory.js';
import {loadStrategies} from './loadStrategies.js';

export default class BoosterConductor extends BoosterFactory {

    registered = []; // ALL registered conductors
    loaded = []; // Only loaded conductor instances

    constructor(extension='booster', conductors = []) {
        super(extension);

        // register any conductors defined in the config
        this.defaults = {
            conductors: conductors,
        }
        this.config = {
            ...this.defaults,
            ...this.config
        };
        this.config.conductors.forEach(conductor => {
            this.register(conductor);
        });
    }

    mount() {
        htmx.on('htmx:afterSettle', (htmxEvent) => {
            htmx.config.currentTargetId = htmxEvent.target.id;
            for (const [key, entry] of Object.entries(this.registered)) {
                this.lifeCycle(entry);
            }
        });
        htmx.on('htmx:historyRestore', (htmxEvent) => {
            htmx.config.currentTargetId = null;
            for (const [key, entry] of Object.entries(this.registered)) {
                this.lifeCycle(entry);
            }
        });
    }

    unmount(/* @vite-ignore */) {}

    /**
     * Manage the conductor lifecycle
     *
     * @param {object}  entry
     */
    lifeCycle(entry) {
        if (entry.conductor in this.loaded) {
            // Conductor has already been loaded
            if (entry.selector) {
                // If the conductor must match a selector,
                // mount/unmount as necessary if found in DOM
                if (document.querySelector(entry.selector)) {
                    if (this.loaded[entry.conductor].mounted) {
                        this.loaded[entry.conductor].refresh();
                    } else {
                        this.loaded[entry.conductor].mount();
                        this.loaded[entry.conductor].mounted = true;
                    }
                } else if (this.loaded[entry.conductor].mounted) {
                    this.loaded[entry.conductor].unmount();
                    this.loaded[entry.conductor].mounted = false;
                }
            }
        } else {
            // Not loaded yet
            if (entry.selector) {
                if (document.querySelector(entry.selector)) {
                    // we matched selector in the DOM, so load the entry
                    this.lazyload(entry);
                }
            } else {
                // load immediately (only once)
                this.lazyload(entry);
            }
        }
    }

    /**
     * Register a conductor
     *
     * @param entry
     * @param {string}  conductor
     * @param {string | null}  selector
     * @param {string | null}  strategy
     * @param {number}  version
     */
    register(entry, {conductor, selector=null, strategy='eager', version=1}=entry) {

        // register conductor
        this.registered.push(entry);

        // lazyload
        this.lifeCycle(entry);
    }

    /**
     * Import a conductor and run its constructor
     * We'll use lazy loading for the chunk file
     *
     * @param {object}  entry
     */
    lazyload(entry) {
        let promises = loadStrategies(entry.strategy, entry.selector);
        Promise.all(promises).then(() => {
            import(/* @vite-ignore */ `${this.config.origin}/${this.config.basePath}/${entry.conductor}.js?v=${entry.version}`).then((lazyConductor) => {
                this.loaded[entry.conductor] = new lazyConductor.default(entry.selector);
                this.loaded[entry.conductor].mounted = true;
            });
        });
    }
}