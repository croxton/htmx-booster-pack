# Booster Pack

### A minimalistic component framework for htmx.

Booster Pack for [htmx](https://github.com/bigskysoftware/htmx) helps with managing your own and third-party scripts, especially when using the powerful [hx-boost](https://htmx.org/attributes/hx-boost/) attribute. Since htmx can effectively turn a website into a single page app, it’s easy to get into a muddle when trying to (re)instantiate and destruct scripts, particularly when it comes to history navigation. This tiny framework provides a simple component lifecycle to wrap your logic in; this allows you to load scripts on demand rather than up-front, and avoid memory leaks. No bundler required, all you need is `<script>`.

You can try it out online with StackBlitz: 
https://stackblitz.com/github/croxton/htmx-booster-pack

#### Add `data-booster` attributes to your HTML:
```html
<div id="celebrate" data-booster="celebrate"></div>
```

#### Write a class and bring it to life:
```js
import confetti from 'https://cdn.skypack.dev/canvas-confetti';
export default class Celebrate extends Booster {
  constructor(elm) {
    super(elm);
    this.mount();
  }
  mount() {
    confetti();
  }
  unmount() {
    confetti.reset();
  }
}
```

## But why?

A core tenet of htmx is to inline implementation details, so that the behaviour of a unit of code is made as obvious as possible. You could use [_hyperscript](https://github.com/bigskysoftware/_hyperscript) to enhance your HTML (you should, it's ace!), but sometimes you'll need to reuse behaviour, or orchestrate multiple elements on the page, or use a third party library, or have different UI behaviour depending on the screen size... At a certain point you may find that separating your logic into discrete components (the [SoC](https://en.wikipedia.org/wiki/Separation_of_concerns) pattern) to be easier to create and maintain than the [LoB](https://htmx.org/essays/locality-of-behaviour/) approach – when that point is reached is entirely up to you.

## Requirements

* [htmx](https://github.com/bigskysoftware/htmx)
* Modern browsers that support [dynamic imports](https://caniuse.com/es6-module-dynamic-import) (sorry IE11!)

## How to use

1. Include `booster.min.js` in the `<head>` of your page, right after `htmx`:
```html
<script defer src="https://cdn.jsdelivr.net/gh/bigskysoftware/htmx@1.9.9/src/htmx.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/croxton/htmx-booster-pack@1.0.4/dist/booster.min.js"></script>
```

2. Create a folder in the webroot of your project to store your scripts, e.g. `/scripts/boosts/`. Add a `<meta>` tag and set the `basePath` of your folder:
```html
<meta name="booster-config" content='{ "basePath" : "/scripts/boosts/" }'>
```

3. Reference the `booster` extension with the `hx-ext` attribute:
```html
<body hx-ext="booster">
```

4. Attach a script to an html element with the `data-booster` attribute.
```html
<div id="message" data-booster="hello"></div>   
```

5. Add a script in the `basePath` folder with the same name, e.g. `hello.js`:
```js
export default class Hello extends Booster {
  message;

  constructor(elm) {
    super(elm);
    this.mount();
  }

  mount() {
    this.message = document.querySelector(this.elm);
    this.message.textContent = 'Hello world!';
  }

  unmount() {
    this.message = null;
  }
}
```

## HTML structure with `hx-boost`

Booster Pack expects the `hx-target` and `hx-select` attributes to reference a *child element* of `<body>`. This would usually also be the [hx-history-elt](https://htmx.org/attributes/hx-history-elt/) element used for history restores.

For example, if you want to boost links in the whole document:

```html
<body hx-ext="booster" 
      hx-boost="true"
      hx-target="#main"
      hx-select="#main"
      hx-swap="outerHTML">
    <main id="main" hx-history-elt>
      [Content that gets swapped]
    </main>
</body>
```

## Attributes

### id
Every component instance must have a unique id. If you reuse a component multiple times in the same document, make sure all have unique id attributes.

### data-booster
The name of your component. No spaces or hyphens, but camelCase is fine. This must match the filename of your script.

### data-load
The loading strategy to use for the component instance. See [Loading strategies](https://github.com/croxton/htmx-booster-pack#loading-strategies) below.

### data-options
A JSON formatted string of options to pass to your component.

```html
<ul
    id="share-buttons"
    data-booster="share"
    data-options='{
         "share"  : [
            "device",
            "linkedin",
            "facebook",
            "twitter",
            "email",
            "copy"
        ],
        "title"  : "My website page",
        "label"  : "Share on",
        "device" : "Share using device sharing",
        "url"    : "https://mywebsite.com"
    }'
></ul>
```

### data-reset
When a component instance is reinitialised on history restore (the user navigates to a page using the browser’s back/forward buttons), the `innerHTML` is automatically reset to its original state, so that your script always has the same markup to work with when it mounts. However, this may not be the desired behaviour when you are appending to the original markup (for example, adding new rows to a table) - in which case you can disable this feature with `data-reset="false"`.

### data-version
A versioning string or hash that will be appended to your script, for cache-busting.

## The `Booster` class

Components are ES6 module classes that extend the `Booster` base class. They are imported dynamically on demand and run directly in the browser. If you need to import npm packages you can use CDNs such as [Skypack](https://www.skypack.dev/), [ESM](https://esm.sh) and [Unpkg](https://unpkg.com), or just host the package files in your project.

### Properties

### elm 
`{string}` A query selector for the element the component is attached to, e.g. `#my-element`.

### options
`{array}` Variable holding options of the component. Default options can be set in the constructor. Options get automatically rewritten from the `data-options` attribute, which should be passed a JSON formatted string.

```html
<div id="my-thing-1" data-booster="myThing" data-options='{"option1":"value1","option2":"value2"}'>
```
```js
constructor() {
    this.options = {
        option1: "default value",
        anotherOption: "default value",
    };
    console.log(this.options); // {"anotherOption":"default value","option1":"value1","option2":"value2"}
}
```

### Methods

#### mount() 
Use this method to initialise your component logic.

```js
    mount() {
      this.instance = document.querySelector(this.elm);
      confetti();
    }
````

#### unmount()
Use this method to remove any references to elements in the DOM so that the browser can perform garbage collection and release memory. Remove any event listeners and observers that you created, and destroy state if you set it. The framework automatically tracks event listeners added to elements and provides a convenience function `clearEventListeners()` that can clean things up for you.

```js
    unmount() {
      this.instance = null;
      confetti.reset();
    }
````

#### css(urls)
Since ES6 modules running in the browser can’t dynamically import CSS, this method provides a convenient way to load an array of stylesheet URLs, returning a promise. Stylesheets will only be loaded once no matter how many component instances you have, or which pages they appear on.

```js
this.css(['https://cdn.plyr.io/3.7.8/plyr.css']).then(() => {
  this.mount();
});
```

#### setState(scope, changes)
Method called to update state. Only changes of state are required to be passed in a form of an object, and these will be merged with current state. Objects stored in state can be scoped as follows:

* `local`: only known to the component instance.
* `component`: shared by all instances of the same class, allowing them to communicate.
* `global`: shared by all components globally.

Use the `component` and `global` scopes with caution: sharing scope has the potential to introduce memory leaks if you store large objects, references to dom nodes or forget to destroy state in `unmount()`.

```js
this.setState('local', {
  a: "a"
});
```

#### getState(scope, defaults)
Retrieve state from the specified scope, optionally passing an object with a set of default values.

```js
let currentState = this.getState('component', { a:null, b:null });
```

#### stateChange(changes)
Called by the `setState` method, with any changes to state passed as an object and intended to be overridden in your class. This can optionally be used to perform all DOM manipulation within a single function. Note that this can only be used with state changes in the `local` scope.

```js
stateChange(stateChanges) {
    if('a' in stateChanges) {
        // "a" was updated
    }
}
```

#### destroyState(scope)
Reset state in the given scope. If you have used state, call this in the `unmount()` method of your class.
```js
this.destroyState('component');
```

### Example class


#### html
```html
<div id="my-thing-1" data-booster="myThing" data-options='{"message":"Hello!"}'></div>
```

#### js
```js
export default class MyThing extends Booster {

  thing;
  thingObserver;

  constructor(elm) {
    super(elm);

    // default options here are merged with those set on the element
    // with data-options='{"option1":"value1"}'
    this.options = {
      message: "Hi, I'm thing",
    };

    // load CSS files, then mount
    this.css(['myStylesheet.css']).then(() => {
      this.mount();
    });
  }

  mount() {
    // setup and mount your component instance
    this.thing = document.querySelector(this.elm);

    // do amazing things...
    this.thing.addEventListener("click", (e) => {
      e.preventDefault();
      console.log(this.options.message); // "Hello!"
    });

    this.thingObserver = new IntersectionObserver(...);
  }

  unmount() {
    // remove any event listeners you created
    this.thing.clearEventListeners();

    // remove any observers you connected
    this.thingObserver.disconnect();
    this.thingObserver = null;

    // unset any references to DOM nodes
    this.thing = null;
  }
}
```

## Loading strategies
Loading strategies allow you to load components asynchronously on demand instead of up-front, freeing up the main thread and speeding up page rendering.

#### Eager
The default strategy if not specified. If the component is present in the page on initial load, or in content swapped into the dom by htmx, it will be loaded and mounted immediately.


#### Event
Components can listen for an event on `document.body` to be triggered before they are loaded. Pass the event name in parentheses.

```html
<div id="my-thing-1" data-booster="myThing" data-load="event (htmx:validation:validate)"></div>
```

#### Idle
Uses `requestIdleCallback` (where supported) to load when the main thread is less busy. Where `requestIdleCallback` isn’t supported (Safari) we use an arbitrary 200ms delay to allow the main thread to clear.

Best used for components that aren’t critical to the initial paint/load.

```html
<div id="my-thing-1" data-booster="myThing" data-load="idle"></div>
```

#### Media
The component will be loaded when the provided media query evaluates as true.

```html
<div id="my-thing-1" data-booster="myThing" data-load="media (max-width: 820px)"></div>
```

#### Visible
Uses IntersectionObserver to only load when the component is in view, similar to lazy-loading images. Optionally, custom root margins can be provided in parentheses.

```html
<div id="my-thing-1" data-booster="myThing" data-load="visible (100px 100px 100px 100px)"></div>
```

#### Combined strategies
Strategies can be combined by separating with a pipe |, allowing for advanced and complex code splitting. All strategies must resolve to trigger loading of the component.

```html
<div id="my-thing-1" data-booster="myThing" data-load="idle | visible | media (min-width: 1024px)"></div>
```

## Thank you

Inspired by:

* [Async Alpine](https://github.com/Accudio/async-alpine)
* [Gia](https://github.com/giantcz/gia)
