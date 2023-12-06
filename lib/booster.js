export default class Booster {
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
        console.warn('Booster Pack: you should not get state manually. Use getState() instead.');
        return this._state;
    }

    set state(state) {
        console.warn('Booster Pack: you should not change state manually. Use setState() instead.');
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