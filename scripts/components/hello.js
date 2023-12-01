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
