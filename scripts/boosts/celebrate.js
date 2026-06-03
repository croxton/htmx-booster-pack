import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/+esm';

export default class Celebrate extends Booster {

  message;

  constructor(elm) {
    super(elm);
    this.mount();
  }

  mount() {
    this.options = {
      message: '',
    };
    this.message = document.querySelector(this.elm);
    this.message.textContent = this.options.message;
    confetti();
  }

  unmount() {
    this.message = null;
    confetti.reset();
  }
}