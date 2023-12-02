# htmx components

## Overview

A minimalistic JavaScript component framework that works seamlessly with [htmx](https://github.com/bigskysoftware/htmx). No bundler required, all you need is `<script>`.

You can try it out online with StackBlitz: 
https://stackblitz.com/github/croxton/htmx-components

## But why?

You want to run scripts when using `hx-boost` or `hx-get` swaps, and not have to worry about how those scripts are initialised or destructed when the page fragment is subsequently swapped out. Or what happens to your scripts when you hit the browser's back/forward buttons and htmx restores the page from it's cache. Maybe you could use [_hyperscript](https://github.com/bigskysoftware/_hyperscript) (you should, it's ace!), but sometimes you'll need to reuse behaviour, or orchestrate multiple elements on the page, or use a third party library, or  load different scripts depending on the screen size... At a certain point you may find [SoC](https://en.wikipedia.org/wiki/Separation_of_concerns) to be more useful than [LoB](https://htmx.org/essays/locality-of-behaviour/) - when that point is reached is entirely up to you.

## Requirements

Modern browsers only (sorry IE11!): https://caniuse.com/es6-module-dynamic-import

## How to use

1. Include `components.min.js` and `history-preserve.min.js` in the `<head>` of your page, right after `htmx`:
```html
<script defer src="https://cdn.jsdelivr.net/gh/bigskysoftware/htmx/src/htmx.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/croxton/htmx-components/dist/components.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/croxton/htmx-components/dist/history-preserve.min.js"></script>
```

2. Create a folder in the webroot of your project to store components, e.g. `/scripts/components/.` Add a `<meta>` tag and set the `basePath` of your folder:
```html
<meta name="htmx-components-config" content='{ "basePath" : "/scripts/components/" }'>
```

3. Reference the `components` and `history-preserve` extensions via the `hx-ext` attribute:
```html
<body hx-ext="components,history-preserve">
```

4. Attach a component to an html element with the `data-component` attribute.
```html
<div id="message" data-component="hello"></div>   
```

5. Add a script in your components folder with the name of your component:
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
    if (this.mounted) {
      this.message = null;
    }
  }
}
```

## Attributes

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

### data-version
A versioning string or hash to append to your script for cache-busting.

### hx-history-preserve
Use this attribute if your component alters the `innerHTML` of elements it is mounted on, and you want to restore the initial markup state of the element when the component is reinitialised.

## Component classes

Components are ES6 classes with a default export.

### mount() 
Use this method to initialise your component.

### unmount()
Use this method to remove any references to elements in the DOM so that the browser can perform garbage collection and release memory. Remove any event listeners and observers that you created. The framework automatically tracks event listeners added to elements and provides a convenience function `clearEventListeners()` that can clean things up for you.

```html
<div id="my-thing-1" data-component="myThing" data-options='{"message":"Hello!"}'></div>
```

`components/local/myThing.js`:

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

        this.mount();
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
        if (this.mounted) {
          // remove any event listeners you created
          this.thing.clearEventListeners();

          // remove any observers you connected
          this.thingObserver.disconnect();
          this.thingObserver = null;

          // unset any references to DOM nodes
          this.thing = null;
        }
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