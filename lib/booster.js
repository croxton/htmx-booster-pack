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
    // Override in child classes to mount a component
  }

  beforeUnmount() {
    // Override in child classes when cleanup is needed.
  }

  unmount() {
    // Override in child classes to unmount a component
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
    this._state = this._isPlainObject(state) ? state : {};
  }

  setState(scope = 'local', changes = {}) {
    if (!this._isPlainObject(changes)) {
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
        if (this._isPlainObject(currentValue)) {
          const mergedValue = {
            ...currentValue,
            ...nextValue,
          };

          if (!this._objectsAreEqual(currentValue, mergedValue)) {
            stateRef[key] = mergedValue;
            stateChanges[key] = { ...nextValue };
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
    if (!href) {
      return Promise.resolve(false);
    }

    if (Booster._sheets[href]) {
      return Booster._sheets[href];
    }

    const existingLink = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => link.href === href || link.getAttribute('href') === href);

    if (existingLink) {
      Booster._sheets[href] = Promise.resolve(existingLink);
      return Booster._sheets[href];
    }

    Booster._sheets[href] = new Promise((resolve, reject) => {
      const link = document.createElement('link');

      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = href;

      link.onload = () => resolve(link);
      link.onerror = () => {
        delete Booster._sheets[href];
        reject(new Error(`Booster Pack: failed to load stylesheet "${href}".`));
      };

      document.head.appendChild(link);
    });

    return Booster._sheets[href];
  }

  js(urls = []) {
    const list = Array.isArray(urls) ? urls : [urls];

    return Promise.all(list.map(src => this._loadJS(src)));
  }

  _loadJS(src) {
    if (!src) {
      return Promise.resolve(false);
    }

    if (Booster._scripts[src]) {
      return Booster._scripts[src];
    }

    const existingScript = [...document.querySelectorAll('script')]
      .find(script => script.src === src || script.getAttribute('src') === src);

    if (existingScript) {
      Booster._scripts[src] = Promise.resolve(existingScript);
      return Booster._scripts[src];
    }

    Booster._scripts[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script');

      script.onload = () => resolve(script);
      script.onerror = () => {
        delete Booster._scripts[src];
        reject(new Error(`Booster Pack: failed to load script "${src}".`));
      };

      script.src = src;
      document.head.appendChild(script);
    });

    return Booster._scripts[src];
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
      const options = JSON.parse(mount.dataset.options);

      return this._isPlainObject(options) ? options : {};
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

  _objectsAreEqual(first, second) {
    if (!this._isPlainObject(first) || !this._isPlainObject(second)) {
      return false;
    }

    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);

    if (firstKeys.length !== secondKeys.length) {
      return false;
    }

    return firstKeys.every(key => first[key] === second[key]);
  }

  _isPlainObject(value) {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
  }
}

Object.defineProperty(Booster, '_sheets', {
  value: {},
  writable: true,
});

Object.defineProperty(Booster, '_scripts', {
  value: {},
  writable: true,
});

Object.defineProperty(Booster, '_globalState', {
  value: {},
  writable: true,
});