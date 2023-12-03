import confetti from 'https://cdn.skypack.dev/canvas-confetti';

export default class Celebrate extends HtmxComponent {

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