export default class Booster {
    mounted = false;
    elm = null;
    target = null;
    _state = {};
    _options = {};

    constructor(element = '', options = {}) {
        this._options = options || {};

        if (element) {
            this.elm = element;
        }
    }

    get options() {
        return this._options;
    }

    set options(defaults = {}) {
        const attributeOptions = this._getOptionsFromAttribute();

        this._options = {
            ...this._options,
            ...defaults,
            ...attributeOptions,
        };
    }

    mount() {
        if (this.mounted) {
            return;
        }
        this.mounted = true;
    }

    beforeUnmount() {
        // Override in child classes when cleanup is needed.
    }

    unmount() {
        if (!this.mounted) {
            return;
        }
        this.mounted = false;
    }

    refresh() {
        this.unmount();
        this.mount();
    }

    get state() {
        console.warn('Booster Pack: you should not get state manually. Use getState() instead.');
        return this._state;
    }

    set state(state) {
        console.warn('Booster Pack: you should not change state manually. Use setState() instead.');
        this._state = state || {};
    }

    setState(scope = 'local', changes = {}) {
        if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
            return;
        }

        const stateRef = this._getStateRef(scope, true);
        const stateChanges = {};

        Object.keys(changes).forEach(key => {
            const nextValue = changes[key];
            const currentValue = stateRef[key];

            if (Array.isArray(nextValue)) {
                if (!this._arraysAreEqual(currentValue, nextValue)) {
                    stateRef[key] = [...nextValue];
                    stateChanges[key] = [...nextValue];
                }

                return;
            }

            if (this._isPlainObject(nextValue)) {
                const objectChanges = {};

                if (this._isPlainObject(currentValue)) {
                    Object.keys(nextValue).forEach(subkey => {
                        if (currentValue[subkey] !== nextValue[subkey]) {
                            objectChanges[subkey] = nextValue[subkey];
                        }
                    });

                    if (Object.keys(objectChanges).length > 0) {
                        stateRef[key] = {
                            ...currentValue,
                            ...objectChanges,
                        };

                        stateChanges[key] = objectChanges;
                    }
                } else {
                    stateRef[key] = { ...nextValue };
                    stateChanges[key] = { ...nextValue };
                }

                return;
            }

            if (currentValue !== nextValue) {
                stateRef[key] = nextValue;
                stateChanges[key] = nextValue;
            }
        });

        if (Object.keys(stateChanges).length > 0) {
            this.stateChange(stateChanges);
        }
    }

    stateChange(changes) {
        // Override in child classes.
    }

    getState(scope = 'local', defaults = {}) {
        const stateRef = this._getStateRef(scope, false);

        return {
            ...defaults,
            ...stateRef,
        };
    }

    destroyState(scope = 'local') {
        if (scope === 'global') {
            Booster._globalState = {};
            return;
        }

        if (scope === 'component') {
            Booster._globalState[this.constructor.name] = {};
            return;
        }

        this._state = {};
    }

    css(urls = []) {
        const list = Array.isArray(urls) ? urls : [urls];

        return Promise.all(list.map(href => this._loadCSS(href)));
    }

    _loadCSS(href) {
        return new Promise((resolve, reject) => {
            if (!href) {
                resolve();
                return;
            }

            if (Booster._sheets[href]) {
                Booster._sheets[href].then(resolve).catch(reject);
                return;
            }

            Booster._sheets[href] = new Promise((sheetResolve, sheetReject) => {
                const link = document.createElement('link');

                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.href = href;
                link.onload = sheetResolve;
                link.onerror = sheetReject;

                document.head.appendChild(link);
            });

            Booster._sheets[href].then(resolve).catch(reject);
        });
    }

    _resolveElement(element) {
        if (!element) {
            return null;
        }

        if (typeof element === 'string') {
            return document.querySelector(element);
        }

        if (element instanceof Element) {
            return element;
        }

        return null;
    }

    _getOptionsFromAttribute() {
        const mount = this._resolveElement(this.elm);

        if (!mount || !mount.dataset || !mount.dataset.options) {
            return {};
        }

        try {
            return JSON.parse(mount.dataset.options);
        } catch (error) {
            console.warn('Booster Pack: invalid JSON in data-options attribute.', error);
            return {};
        }
    }

    _getStateRef(scope = 'local', create = false) {
        if (scope === 'global') {
            return Booster._globalState;
        }

        if (scope === 'component') {
            const componentName = this.constructor.name;

            if (create && !Object.prototype.hasOwnProperty.call(Booster._globalState, componentName)) {
                Booster._globalState[componentName] = {};
            }

            return Booster._globalState[componentName] || {};
        }

        return this._state;
    }

    _arraysAreEqual(first, second) {
        if (!Array.isArray(first) || !Array.isArray(second)) {
            return false;
        }

        if (first.length !== second.length) {
            return false;
        }

        return first.every((item, index) => item === second[index]);
    }

    _isPlainObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
}

Object.defineProperty(Booster, '_sheets', {
    value: {},
    writable: true,
});

Object.defineProperty(Booster, '_globalState', {
    value: {},
    writable: true,
});