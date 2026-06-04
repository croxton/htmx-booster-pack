const visible = (selector = null, requirement) => {
    if (selector) {
        return new Promise((resolve, reject) => {

            let intersectionObserver = null;

            const cleanup = () => {
                if (intersectionObserver) {
                    intersectionObserver.disconnect();
                }
                console.log('Actually cleaning up', selector);
                window.removeEventListener("booster:detached", onDetach);
            };

            let onDetach = (event) => {
                console.log('booster:detached', event?.detail);
                console.log('selector', selector);
                if (event.detail.selector === selector) {
                    cleanup();
                    resolve(false);
                }
            }

            window.addEventListener("booster:detached", onDetach);

            // Be nice to browsers that don't support IntersectionObserver
            if (!('IntersectionObserver' in window)) {
                cleanup();
                resolve();
                return;
            }

            // work out if a rootMargin has been specified, and if so take it from the requirement
            let rootMargin = '0px 0px 0px 0px';
            if (requirement.indexOf('(') !== -1) {
                const rootMarginStart = requirement.indexOf('(') + 1;
                rootMargin = requirement.slice(rootMarginStart, -1).trim();
            }

            const elm = document.querySelector(selector);

            if (!elm) {
                cleanup();
                resolve(); // no element matched, resolve immediately
                return;
            }

            intersectionObserver = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) {
                    cleanup();
                    resolve();
                }
            }, { rootMargin });

            intersectionObserver.observe(elm);
        });
    }

    // no element to observe so resolve immediately
    return Promise.resolve(true);
};

export default visible;