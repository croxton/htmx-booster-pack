import BoosterFactory from './boosterFactory.js';
import {loadStrategies} from './loadStrategies.js';

export default class BoosterConductor extends BoosterFactory {

    registered = []; // ALL registered conductors
    loaded = {}; // Only loaded conductor instances
    loading = {};
    cacheHit = false; // restoring from history cache?

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
        htmx.on('htmx:beforeHistorySave', () => {
            for (const entry of this.registered) {
                const conductor = this.loaded[entry.conductor];

                if (!conductor || !entry.selector) {
                    continue;
                }

                if (document.querySelector(entry.selector) && conductor.mounted) {
                    conductor.beforeUnmount?.();
                }
            }
        });

        htmx.on('htmx:afterSettle', (htmxEvent) => {
            htmx.config.currentTargetId = htmxEvent.target?.id ?? null;

            for (const entry of this.registered) {
                this.lifeCycle(entry);
            }
        });

        htmx.on('htmx:historyCacheHit', (htmxEvent) => {
          // event only exists in >= htmx 2.0.5
          this.cacheHit = true;
        });

        htmx.on('htmx:historyRestore', (htmxEvent) => {
            htmx.config.currentTargetId = null;
            if (!this.cacheHit) {
                for (const entry of this.registered) {
                    this.lifeCycle(entry);
                }
            }

            this.cacheHit = false;
        });
    }

    unmount(/* @vite-ignore */) {}

    /**
     * Manage the conductor lifecycle
     *
     * @param {object}  entry
     */
    lifeCycle(entry) {

        if (!entry?.conductor) {
            console.warn('Booster Pack: conductor is missing a name.', entry);
            return;
        }

        const conductor = this.loaded[entry.conductor];

        if (conductor) {
            // Conductor has already been loaded
            if (entry.selector) {
                // If the conductor must match a selector,
                // mount/unmount as necessary if found in DOM
                if (document.querySelector(entry.selector)) {
                    if (conductor.mounted) {
                        conductor.refresh?.();
                    } else {
                        conductor.mount?.();
                        conductor.mounted = true;
                    }
                } else if (conductor.mounted) {
                    conductor.unmount?.();
                    conductor.mounted = false;
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

        if (!entry?.conductor) {
            console.warn('Booster Pack: invalid conductor registration.', entry);
            return;
        }

        if (this.registered.some((registeredEntry) => registeredEntry.conductor === entry.conductor)) {
            return;
        }

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
        if (this.loaded[entry.conductor] || this.loading[entry.conductor]) {
            return;
        }

        this.loading[entry.conductor] = true;

        const promises = loadStrategies(entry.strategy, entry.selector);

        Promise.all(promises)
            .then(() => import(/* @vite-ignore */ `${this.config.origin}/${this.config.basePath}/${entry.conductor}.js?v=${entry.version}`))
            .then((lazyConductor) => {
                const ConductorClass = lazyConductor.default;

                if (typeof ConductorClass !== 'function') {
                    throw new TypeError(`Booster Pack: conductor ${entry.conductor} does not export a default class.`);
                }

                const conductor = new ConductorClass(entry.selector);
                conductor.mounted = true;

                this.loaded[entry.conductor] = conductor;
            })
            .catch((error) => {
                console.error(`Booster Pack: failed to load conductor ${entry.conductor}.`, error);
            })
            .finally(() => {
                delete this.loading[entry.conductor];
            });
    }
}