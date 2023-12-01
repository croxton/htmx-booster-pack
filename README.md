# htmx components

## Overview

A minimalistic javaScript component framework that works seamlessly with htmx. No bundler required, all you need is `<script>`.

## Requirements

Modern browsers only (sorry IE11!): https://caniuse.com/es6-module-dynamic-import

## How to use

1. Include `components.min.js` and `history-preserve.min.js` in the `<head>` of your page, right after `htmx`:
```html
<script defer src="https://cdn.jsdelivr.net/gh/bigskysoftware/htmx/src/htmx.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/croxton/htmx-components/dist/components.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/croxton/htmx-components/dist/history-preserve.js"></script>
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

### data-component

### data-load

### data-version

### data-options

### hx-history-preserve

## Component classes

### mount() 

### unmount()