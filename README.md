# htmx components

## Overview

A minimalistic component framework that works seamlessly with [htmx](https://github.com/bigskysoftware/htmx) and [hx-boost](https://htmx.org/attributes/hx-boost/). No bundler required, all you need is `<script>`.

You can try it out online with StackBlitz: 
https://stackblitz.com/github/croxton/htmx-components

### Add `data-component` attributes to your HTML:
```html
<div id="celebrate" data-component="celebrate"></div>
```

### Write a component class and bring it to life:
```js
import confetti from 'https://cdn.skypack.dev/canvas-confetti';
export default class Celebrate extends HtmxComponent {
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

You want to run scripts when using `hx-boost` or `hx-get` swaps, and not have to worry about how those scripts are initialised or destructed when the page fragment is subsequently swapped out. Or what happens to your scripts when you hit the browser's back/forward buttons and htmx restores the page from it's cache. Maybe you could use [_hyperscript](https://github.com/bigskysoftware/_hyperscript) (you should, it's ace!), but sometimes you'll need to reuse behaviour, or orchestrate multiple elements on the page, or use a third party library, or have different UI behaviour depending on the screen size... At a certain point you may find that separating your logic into discrete components (the [SoC](https://en.wikipedia.org/wiki/Separation_of_concerns) pattern) to be easier to create and maintain than the [LoB](https://htmx.org/essays/locality-of-behaviour/) approach - when that point is reached is entirely up to you.

## Requirements

* [htmx](https://github.com/bigskysoftware/htmx)
* Modern browsers that support [dynamic imports](https://caniuse.com/es6-module-dynamic-import) (sorry IE11!)

## How to use

1. Include `components.min.js` in the `<head>` of your page, right after `htmx`:
```html
<script defer src="https://cdn.jsdelivr.net/gh/bigskysoftware/htmx@1.9.9/src/htmx.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/croxton/htmx-components@1.0.2/dist/components.min.js"></script>
```

2. Create a folder in the webroot of your project to store components, e.g. `/scripts/components/.` Add a `<meta>` tag and set the `basePath` of your folder:
```html
<meta name="htmx-components-config" content='{ "basePath" : "/scripts/components/" }'>
```

3. Reference the `components` extension with the `hx-ext` attribute:
```html
<body hx-ext="components">
```

4. Attach a component to an html element with the `data-component` attribute.
```html
<div id="message" data-component="hello"></div>   
```

5. Add a script in your components folder with the same name as your component, e.g. `hello.js`:
```js
export default class Hello extends HtmxComponent {
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

htmx components expects the `hx-target` and `hx-select` attributes to reference a *child element* of `<body>`. This should always be the [hx-history-elt](https://htmx.org/attributes/hx-history-elt/) element.

For example, if you want to boost links in the whole document:

```html
<body hx-ext="components" 
      hx-boost="true"
      hx-target="#main"
      hx-select="#main"
      hx-swap="outerHTML">
    <main id="main" hx-history-elt>
      [Content that gets swapped]
    </main>
</body>
```

## Component attributes

### id
Every component must have a unique id. If you reuse a component multiple times in the same document, make sure all have unique id attributes.

### data-component
The name of your component. No spaces or hyphens, but camelCase is fine. This must match the filename of your component script.

### data-load
The loading strategy to use for the component. See [Loading strategies](https://github.com/croxton/htmx-components#loading-strategies) below.

### data-options
A JSON formatted string of options to pass to your component.

```html
<ul
    id="share-buttons"
    data-component="share"
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

## Component classes

Components are ES6 module classes that extend the `HtmxComponent` base class. They are imported dynamically on demand and run directly in the browser. If you need to import npm packages you can use CDNs such as [Skypack](https://www.skypack.dev/), [ESM](https://esm.sh) and [Unpkg](https://unpkg.com), or just host the package files in your project.

### mount() 
Use this method to initialise your component logic.

### unmount()
Use this method to remove any references to elements in the DOM so that the browser can perform garbage collection and release memory. Remove any event listeners and observers that you created. The framework automatically tracks event listeners added to elements and provides a convenience function `clearEventListeners()` that can clean things up for you.

### css()
Since ES6 modules running in the browser can’t dynamically import CSS, this method provides a convenient way to load an array of stylesheets, returning a promise. Stylesheets will only be loaded once no matter how many component instances you have, or which pages they appear on.

```html
<div id="my-thing-1" data-component="myThing" data-options='{"message":"Hello!"}'></div>
```

`scripts/components/myThing.js`:

```js
export default class MyThing extends HtmxComponent {
    
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
<div id="my-thing-1" data-component="myThing" data-load="event (htmx:validation:validate)"></div>
```

#### Idle
Uses `requestIdleCallback` (where supported) to load when the main thread is less busy. Where `requestIdleCallback` isn’t supported (Safari) we use an arbitrary 200ms delay to allow the main thread to clear.

Best used for components that aren’t critical to the initial paint/load.

```html
<div id="my-thing-1" data-component="myThing" data-load="idle"></div>
```

#### Media
The component will be loaded when the provided media query evaluates as true.

```html
<div id="my-thing-1" data-component="myThing" data-load="media (max-width: 820px)"></div>
```

#### Visible
Uses IntersectionObserver to only load when the component is in view, similar to lazy-loading images. Optionally, custom root margins can be provided in parentheses.

```html
<div id="my-thing-1" data-component="myThing" data-load="visible (100px 100px 100px 100px)"></div>
```

#### Combined strategies
Strategies can be combined by separating with a pipe |, allowing for advanced and complex code splitting. All strategies must resolve to trigger loading of the component.

```html
<div id="my-thing-1" data-component="myThing" data-load="idle | visible | media (min-width: 1024px)"></div>
```