const media = (selector = null, requirement) => {
    return new Promise(resolve => {
        const queryStart = requirement.indexOf('(');
        if (queryStart === -1) {
            resolve();
            return;
        }
        const query = requirement.slice(queryStart).trim();
        const mediaQuery = window.matchMedia(query);
        if (mediaQuery.matches) {
            resolve();
        } else {
            const cleanup = () => {
                mediaQuery.removeEventListener("change", onChange);
                window.removeEventListener("booster:detached", onDetach);
                console.log("media strategy: cleanup");
            };
            const onChange = (event) => {
                if (event.matches) {
                    cleanup();
                    resolve();
                }
            };
            mediaQuery.addEventListener('change', onChange);

            const onDetach = (event) => {
                if (event.detail.selector === selector) {
                    cleanup();
                    resolve(false);
                }
            }
            window.addEventListener("booster:detached", onDetach);
        }
    });
};

export default media;