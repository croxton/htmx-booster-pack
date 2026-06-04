const visible = (selector = null, requirement) => {
    if (selector) {
        return new Promise((resolve, reject) => {
            const abortController = new AbortController();
            const { signal } = abortController;

            let intersectionObserver = null;
            let mutationObserver = null;

            const cleanup = () => {
                if (intersectionObserver) {
                    intersectionObserver.disconnect();
                }

                if (mutationObserver) {
                    mutationObserver.disconnect();
                }

                signal.removeEventListener('abort', onAbort);
            };

            const onAbort = () => {
                // Observed element is no longer in the DOM
                cleanup();
                resolve(false);
            };

            signal.addEventListener('abort', onAbort);

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

            mutationObserver = new MutationObserver(() => {
                if (!document.documentElement.contains(elm)) {
                    abortController.abort();
                }
            });

            mutationObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });

            intersectionObserver.observe(elm);
        });
    }

    // no element to observe so resolve immediately
    return Promise.resolve(true);
};

export default visible;