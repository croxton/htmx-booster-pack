var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value);
class Booster {
  constructor(element = "", options = {}) {
    __publicField(this, "mounted", !1);
    __publicField(this, "elm", null);
    __publicField(this, "target", null);
    __publicField(this, "_state", {});
    this._options = options || {}, element && (this.elm = element);
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
        optionsFromAttribute && (options = JSON.parse(optionsFromAttribute)), mount = null;
      }
    }
    this._options = {
      ...this._options,
      ...defaults,
      ...options
    };
  }
  mount() {
  }
  unmount() {
  }
  refresh() {
    this.unmount(), this.mount();
  }
  get state() {
    return console.warn("Booster Pack: you should not get state manually. Use getState() instead."), this._state;
  }
  set state(state) {
    console.warn("Booster Pack: you should not change state manually. Use setState() instead."), this._state = state;
  }
  setState(scope = "local", changes) {
    let stateChanges = {}, stateRef = this._state;
    scope === "global" ? stateRef = Booster._globalState : scope === "component" && (Booster._globalState.hasOwnProperty(this.constructor.name) || (Booster._globalState[this.constructor.name] = {}), stateRef = Booster._globalState[this.constructor.name]), Object.keys(changes).forEach((key) => {
      Array.isArray(changes[key]) ? stateRef[key] != null && Array.isArray(stateRef[key]) && stateRef[key].length === changes[key].length ? changes[key].some((item, index) => stateRef[key][index] !== item ? (stateChanges[key] = changes[key], stateRef[key] = stateChanges[key], !0) : !1) : (stateChanges[key] = changes[key], stateRef[key] = stateChanges[key]) : typeof changes[key] == "object" ? (stateRef[key] != null && typeof stateRef[key] == "object" ? (stateChanges[key] = {}, Object.keys(changes[key]).forEach((subkey) => {
        stateRef[key][subkey] !== changes[key][subkey] && (stateChanges[key][subkey] = changes[key][subkey]);
      })) : stateChanges[key] = changes[key], stateRef[key] = {
        ...stateRef[key],
        ...stateChanges[key]
      }) : stateRef !== changes[key] && (stateChanges[key] = changes[key], stateRef[key] = changes[key]);
    }), Object.keys(stateChanges).forEach((key) => {
      Array.isArray(changes[key]) ? stateChanges[key].length === 0 && delete stateChanges[key] : typeof changes[key] == "object" && Object.keys(stateChanges[key]).length === 0 && delete stateChanges[key];
    }), stateRef = null, this.stateChange(stateChanges);
  }
  stateChange(changes) {
  }
  getState(scope = "local", defaults = {}) {
    let stateRef = this._state;
    return scope === "global" ? stateRef = Booster._globalState : scope === "component" && (Booster._globalState.hasOwnProperty(this.constructor.name) ? stateRef = Booster._globalState[this.constructor.name] : stateRef = {}), {
      ...defaults,
      ...stateRef
    };
  }
  destroyState(scope = "local") {
    scope === "global" ? Booster._globalState = {} : scope === "component" ? Booster._globalState.hasOwnProperty(this.constructor.name) && (Booster._globalState[this.constructor.name] = {}) : this._state = {};
  }
  css(urls) {
    return Promise.all(urls.map(this._loadCSS));
  }
  _loadCSS(href) {
    return new Promise((resolve) => {
      if (Booster._sheets.includes(href))
        return resolve();
      Booster._sheets.push(href);
      let link = document.createElement("link");
      link.type = "text/css", link.rel = "stylesheet", link.onload = resolve, link.setAttribute("href", href), document.head.appendChild(link);
    });
  }
}
Object.defineProperty(Booster, "_sheets", {
  value: [],
  writable: !0
});
Object.defineProperty(Booster, "_globalState", {
  value: {},
  writable: !0
});
class BoosterExt {
  constructor(factoryClass, extension) {
    let factory, cache = {
      now: {},
      next: {}
    };
    function saveToCache(dom, store) {
      let markers = dom.querySelectorAll("[data-" + extension + ']:not([data-reset="false"]), [hx-history-preserve]:not([data-reset="false"])');
      if (markers)
        for (let i = 0; i < markers.length; ++i)
          typeof markers[i].id < "u" && (cache[store][markers[i].id] = markers[i].outerHTML);
    }
    function rotateCache() {
      let prunedCache = {};
      for (let key in cache.now) {
        let el = document.getElementById(key);
        el && (prunedCache[key] = cache.now[key]), el = null;
      }
      cache.now = prunedCache, Object.keys(cache.next).length > 0 && (cache.now = {
        ...cache.now,
        ...cache.next
      }, cache.next = {});
    }
    htmx.defineExtension(extension, {
      init: function() {
        factory = new factoryClass(extension), factory.mounted = !0, saveToCache(document, "now");
      },
      onEvent: function(name, htmxEvent) {
        var _a, _b;
        if (name === "htmx:beforeSwap") {
          let incomingDOM = new DOMParser().parseFromString(
            htmxEvent.detail.xhr.response,
            "text/html"
          );
          incomingDOM && saveToCache(incomingDOM, "next"), incomingDOM = null;
        }
        if (name === "htmx:afterSettle" && (htmx.config.currentTargetId = htmxEvent.target.id, factory.refresh()), name === "htmx:historyItemCreated" && htmxEvent.detail.item.content) {
          let cachedDOM = new DOMParser().parseFromString(
            htmxEvent.detail.item.content,
            "text/html"
          );
          for (let key in cache.now) {
            let el = cachedDOM.getElementById(key);
            el && (el.outerHTML = cache.now[key]), el = null;
          }
          htmxEvent.detail.item.content = cachedDOM.body.innerHTML, rotateCache();
        }
        if (name === "htmx:historyRestore") {
          htmx.config.currentTargetId = null, factory.refresh();
          let restored = (_b = (_a = htmxEvent == null ? void 0 : htmxEvent.detail) == null ? void 0 : _a.item) == null ? void 0 : _b.content;
          if (restored) {
            let restoredDOM = new DOMParser().parseFromString(
              restored,
              "text/html"
            );
            restoredDOM && saveToCache(restoredDOM, "now");
          }
        }
      }
    });
  }
}
const event = (requirement) => new Promise((resolve) => {
  let topic;
  if (requirement.indexOf("(") !== -1) {
    const topicStart = requirement.indexOf("(") + 1;
    topic = requirement.slice(topicStart, -1);
  }
  topic ? document.body.addEventListener(topic, () => {
    resolve();
  }, { once: !0 }) : resolve();
}), idle = () => new Promise((resolve) => {
  "requestIdleCallback" in window ? window.requestIdleCallback(resolve) : setTimeout(resolve, 200);
}), media = (requirement) => new Promise((resolve) => {
  const queryStart = requirement.indexOf("("), query = requirement.slice(queryStart), mediaQuery = window.matchMedia(query);
  mediaQuery.matches ? resolve() : mediaQuery.addEventListener("change", resolve, { once: !0 });
}), visible = (selector = null, requirement) => selector ? new Promise((resolve) => {
  let rootMargin = "0px 0px 0px 0px";
  if (requirement.indexOf("(") !== -1) {
    const rootMarginStart = requirement.indexOf("(") + 1;
    rootMargin = requirement.slice(rootMarginStart, -1);
  }
  const observer = new IntersectionObserver((entries) => {
    entries[0].isIntersecting && (observer.disconnect(), resolve());
  }, { rootMargin });
  let elm = document.querySelector(selector);
  elm ? observer.observe(elm) : resolve();
}) : Promise.resolve(!0);
function loadStrategies(strategy, selector) {
  let promises = [];
  if (strategy) {
    let requirements = strategy.split("|").map((requirement) => requirement.trim()).filter((requirement) => requirement !== "immediate").filter((requirement) => requirement !== "eager");
    for (let requirement of requirements) {
      if (requirement.startsWith("event")) {
        promises.push(
          event(requirement)
        );
        continue;
      }
      if (requirement === "idle") {
        promises.push(
          idle()
        );
        continue;
      }
      if (requirement.startsWith("media")) {
        promises.push(
          media(requirement)
        );
        continue;
      }
      requirement.startsWith("visible") && promises.push(
        visible(selector, requirement)
      );
    }
  }
  return promises;
}
class BoosterFactory extends Booster {
  constructor(extension = "booster") {
    super();
    __publicField(this, "loaded", []);
    __publicField(this, "config", {});
    __publicField(this, "extension", "");
    this.extension = extension, this.config = {
      origin: location.origin,
      basePath: "scripts/boosts"
    };
    let configMeta = document.querySelector('meta[name="' + this.extension + '-config"]') ?? null;
    configMeta && (this.config = {
      ...this.config,
      ...JSON.parse(configMeta.content)
    }), this.config.basePath = this.config.basePath.replace(/^\/|\/$/g, ""), this.mount();
  }
  mount() {
    let targetId = htmx.config.currentTargetId ?? "main", target = document.getElementById(targetId);
    if (target) {
      let components = target.querySelectorAll("[data-" + this.extension + "]");
      for (let el of components)
        this.lazyload(el);
      target = null, components = null;
    }
  }
  unmount() {
    let targetId = htmx.config.currentTargetId ?? "main", target = document.getElementById(targetId);
    if (target) {
      for (let i = this.loaded.length - 1; i >= 0; i--) {
        let inTarget = target.querySelector(this.loaded[i].selector), inDocument = document.querySelector(this.loaded[i].selector);
        (inTarget || !inDocument) && (this.loaded[i].instance.unmount(), this.loaded.splice(i, 1));
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
    let component = el.dataset[this.extension], version = el.dataset.version ?? "1", strategy = el.dataset.load ?? null, selector = el.getAttribute("id") ? "#" + el.getAttribute("id") : null;
    if (selector === null)
      return console.warn(`Booster Pack: an instance of ${component} doesn't have an ID attribute. Skipping.`);
    let promises = loadStrategies(strategy, selector);
    Promise.all(promises).then(() => {
      import(
        /* @vite-ignore */
        `${this.config.origin}/${this.config.basePath}/${component}.js?v=${version}`
      ).then(
        (lazyComponent) => {
          let instance = new lazyComponent.default(selector);
          instance.mounted = !0, this.loaded.push({
            name: component,
            selector,
            instance
          });
        }
      );
    });
  }
}
class BoosterConductor extends BoosterFactory {
  // Only loaded conductor instances
  constructor(extension = "booster", conductors = []) {
    super(extension);
    __publicField(this, "registered", []);
    // ALL registered conductors
    __publicField(this, "loaded", []);
    this.defaults = {
      conductors
    }, this.config = {
      ...this.defaults,
      ...this.config
    }, this.config.conductors.forEach((conductor) => {
      this.register(conductor);
    });
  }
  mount() {
    htmx.on("htmx:afterSettle", (htmxEvent) => {
      htmx.config.currentTargetId = htmxEvent.target.id;
      for (const [key, entry] of Object.entries(this.registered))
        this.lifeCycle(entry);
    }), htmx.on("htmx:historyRestore", (htmxEvent) => {
      htmx.config.currentTargetId = null;
      for (const [key, entry] of Object.entries(this.registered))
        this.lifeCycle(entry);
    });
  }
  unmount() {
  }
  /**
   * Manage the conductor lifecycle
   *
   * @param {object}  entry
   */
  lifeCycle(entry) {
    entry.conductor in this.loaded ? entry.selector && (document.querySelector(entry.selector) ? this.loaded[entry.conductor].mounted ? this.loaded[entry.conductor].refresh() : (this.loaded[entry.conductor].mount(), this.loaded[entry.conductor].mounted = !0) : this.loaded[entry.conductor].mounted && (this.loaded[entry.conductor].unmount(), this.loaded[entry.conductor].mounted = !1)) : entry.selector ? document.querySelector(entry.selector) && this.lazyload(entry) : this.lazyload(entry);
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
  register(entry, { conductor, selector = null, strategy = "eager", version = 1 } = entry) {
    this.registered.push(entry), this.lifeCycle(entry);
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
      import(
        /* @vite-ignore */
        `${this.config.origin}/${this.config.basePath}/${entry.conductor}.js?v=${entry.version}`
      ).then((lazyConductor) => {
        this.loaded[entry.conductor] = new lazyConductor.default(entry.selector), this.loaded[entry.conductor].mounted = !0;
      });
    });
  }
}
export {
  Booster,
  BoosterConductor,
  BoosterExt,
  BoosterFactory,
  loadStrategies
};
