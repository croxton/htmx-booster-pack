/**
 * Unveil (conductor)
 *
 * Facilitates unveil animations on initial image loaded / restore from cache.
 * Adds a class 'is-loaded' to elements with the [data-unveil] attribute
 * when all images matching a selector, or images nested inside, are loaded.
 */

/**
 * Example markup

 * Wait for one or more images nested inside to load:
 <div data-unveil class="opacity-0 is-loaded:opacity-100 transition-opacity">
 <img src="my-image1.jpg" width="800" height="600" alt="">
 </div>

 * Wait for image(s) matching a selector (anywhere in document) to load:
 <div data-unveil=".lazy-images" class="opacity-0 is-loaded:opacity-100 transition-opacity">
 <img class="lazy-images" src="my-image1.jpg" width="800" height="600" alt="">
 </div>
 <img class="lazy-images" src="my-image2.jpg" width="800" height="600" alt="">

 * Wait for self to load:
 <img data-unveil class="opacity-0 is-loaded:opacity-100 transition-opacity" src="my-image1.jpg" width="800" height="600" alt="">
 */

import { Booster } from 'htmx-booster-pack';

export default class Unveil extends Booster {
    images = [];

    constructor(elm) {
        super(elm);
    }

    static create() {
        return Object.create(this.prototype);
    }

    mount() {
        const veils = document.querySelectorAll(this.elm + ':not(.is-loaded)');
        veils.forEach((veil) => {
            let images;
            if (veil.dataset.unveil) {
                // wait for any image(s) matching the given selector
                images = Array.from(document.querySelectorAll(veil.dataset.unveil));
            } else {
                if (veil.tagName === 'IMG') {
                    // wait for self to load if it's an image
                    images = [veil];
                } else {
                    // or, wait for any image(s) found inside the veil
                    images = Array.from(veil.querySelectorAll('img'));
                }
            }
            if (images) {
                this.images = this.images.concat(images);
                this.waitForAllImages(images).then(() => {
                    veil.classList.add('is-loaded');
                });
            }
        });
    }

    waitForAllImages(images) {
        let promises = [];
        images.forEach((img) => {
            promises.push(this.waitForImage(img));
        });
        return new Promise((resolve) => {
            Promise.all(promises).then(() => {
                resolve();
            });
        });
    }

    waitForImage(img) {
        return new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
                // cached image
                resolve();
            } else {
                img.loadHandler = (e) => {
                    img.removeEventListener('load', img.loadHandler);
                    img.removeEventListener('error', img.loadHandler);
                    img.removeEventListener('lazybeforeunveil', img.loadHandler);
                    resolve();
                };
                // resolve on load or error
                img.addEventListener('load', img.loadHandler);
                img.addEventListener('error', img.loadHandler);

                // lazyloaded image
                // => requires lazysizes: https://github.com/aFarkas/lazysizes)
                img.addEventListener('lazybeforeunveil', img.loadHandler);
            }
        });
    }

    unmount() {
        this.images.forEach((img) => {
            img.removeEventListener('load', img.loadHandler);
            img.removeEventListener('lazybeforeunveil', img.loadHandler);
            img.removeEventListener('error', img.loadHandler);
        });
        this.images = [];
    }
}