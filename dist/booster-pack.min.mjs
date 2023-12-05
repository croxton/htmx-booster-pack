var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value;
var __publicField = (obj, key, value) => (__defNormalProp(obj, typeof key != "symbol" ? key + "" : key, value), value);
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
    return console.warn("You should not get state manually. Use getState() instead."), this._state;
  }
  set state(state) {
    console.warn("You should not change state manually. Use setState() instead."), this._state = state;
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
export {
  Booster,
  loadStrategies
};
